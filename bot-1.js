// bot-avancado.js
// Requisitos: npm i axios crypto dotenv
require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const API_KEY = process.env.BINANCE_API_KEY;
const SECRET_KEY = process.env.BINANCE_SECRET_KEY;
const API_URL = process.env.API_URL || 'https://testnet.binance.vision';

const SYMBOL = process.env.SYMBOL || 'BTCUSDT';
const INTERVAL = process.env.INTERVAL || '15m';
const KLIMIT = parseInt(process.env.KLIMIT || '100');

const RISK_PERCENT = parseFloat(process.env.RISK_PERCENT || '0.5'); // % do capital arriscado por trade (ex: 0.5 = 0.5%)
const ACCOUNT_CAPITAL = parseFloat(process.env.ACCOUNT_CAPITAL || '1000'); // em USDT — ajustar conforme saldo real
const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS_PCT || '1.0'); // pct de stop loss relativo ao preço de entrada (ex: 1%)
const TAKE_PROFIT_PCT = parseFloat(process.env.TAKE_PROFIT_PCT || '2.0'); // pct de take profit (ex: 2%)

const DRY_RUN = (process.env.DRY_RUN === 'true'); // se true não envia ordens reais
const LOOP_MS = parseInt(process.env.LOOP_MS || '5000'); // 5s entre checks (ajuste)

let isOpened = false;
let currentPosition = null; // { side, entryPrice, qty, stopPrice, tpPrice }

async function getServerTime() {
  const res = await axios.get(`${API_URL}/api/v3/time`);
  return res.data.serverTime;
}

async function signedRequest(path, params = {}, method = 'GET') {
  const ts = await getServerTime();
  params.timestamp = ts;
  if (!params.recvWindow) params.recvWindow = 10000;
  const qs = new URLSearchParams(params).toString();
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(qs).digest('hex');
  const url = `${API_URL}${path}?${qs}&signature=${signature}`;
  const opts = {
    method,
    url,
    headers: { 'X-MBX-APIKEY': API_KEY },
    timeout: 10000,
  };
  return axios(opts);
}

async function publicGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_URL}${path}${qs ? '?' + qs : ''}`;
  return axios.get(url);
}

/* ---------------- Indicators ---------------- */

function calcSMA(arr, period) {
  const res = [];
  for (let i = 0; i <= arr.length - period; i++) {
    const window = arr.slice(i, i + period);
    res.push(window.reduce((a,b)=>a+b,0)/period);
  }
  return res; // length = arr.length - period + 1
}

function calcEMA(arr, period) {
  const k = 2/(period+1);
  const res = [];
  // first EMA = SMA of first period
  const firstSMA = arr.slice(0,period).reduce((a,b)=>a+b,0)/period;
  res[period-1] = firstSMA;
  for (let i = period; i < arr.length; i++) {
    const emaPrev = res[i-1];
    const ema = (arr[i]-emaPrev)*k + emaPrev;
    res[i] = ema;
  }
  // compact: return only defined entries
  return res.filter(v => v !== undefined);
}

// RSI (period typical 14)
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return [];
  const deltas = [];
  for (let i=1;i<closes.length;i++) deltas.push(closes[i]-closes[i-1]);
  let gains = 0, losses = 0;
  for (let i=0;i<period;i++){
    const d = deltas[i];
    if (d>0) gains += d; else losses += Math.abs(d);
  }
  let avgGain = gains/period;
  let avgLoss = losses/period;
  const rsis = [];
  rsis[period] = 100 - (100/(1 + (avgGain/avgLoss || 0.000001)));
  for (let i = period+1; i < closes.length; i++){
    const delta = deltas[i-1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgGain / (avgLoss || 0.000001);
    rsis[i] = 100 - (100 / (1 + rs));
  }
  // compress
  return rsis.slice(period).map(v => v === undefined ? null : v);
}

// ATR
function calcATR(highs, lows, closes, period=14) {
  const trs = [];
  for (let i=1;i<highs.length;i++){
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i-1]),
      Math.abs(lows[i] - closes[i-1])
    );
    trs.push(tr);
  }
  if (trs.length < period) return [];
  let atr = trs.slice(0,period).reduce((a,b)=>a+b,0)/period;
  const res = [atr];
  for (let i = period; i < trs.length; i++){
    atr = ( (atr * (period-1)) + trs[i] ) / period;
    res.push(atr);
  }
  return res; // corresponds to positions starting at index period
}

/* ---------------- Utilities ---------------- */

function roundStep(value, step) {
  // step like 0.001 etc
  const inv = 1/step;
  return Math.floor(value * inv) / inv;
}

function printStatus(price, indicators) {
  console.clear();
  console.log(new Date().toLocaleString());
  console.log(`Symbol: ${SYMBOL} Price: ${price}`);
  console.log("Indicators:", indicators);
  console.log("Position:", currentPosition);
}

/* ---------------- Strategy (simple multi-indicator) ----------------
Rules (example):
- BUY when:
  price < EMA(21) * 0.995 (a little below EMA) AND RSI(14) < 45 AND price < SMA(50)
- SELL when:
  price > EMA(21) * 1.01 OR RSI(14) > 60 OR price > SMA(50) * 1.01
You must tune thresholds.
--------------------------------------------------------------- */

function generateSignal(price, indicators) {
  const { ema21, sma50, rsi14 } = indicators;
  if (!ema21 || !sma50 || rsi14 === null || rsi14 === undefined) return 'hold';

  const buyCond = price < ema21 * 0.995 && rsi14 < 45 && price < sma50;
  const sellCond = price > ema21 * 1.01 || rsi14 > 60 || price > sma50 * 1.01;

  if (!isOpened && buyCond) return 'buy';
  if (isOpened && sellCond) return 'sell';
  return 'hold';
}

/* ---------------- Position Sizing ----------------
- Risk per trade = ACCOUNT_CAPITAL * RISK_PERCENT / 100
- Stop distance = STOP_LOSS_PCT% of price
- Qty = risk / (stopDistance in USDT)  => for BTCUSDT, qty = risk / (price * stopPct)
------------------------------------------------ */
function calcQtyByRisk(price) {
  const riskUSDT = ACCOUNT_CAPITAL * (RISK_PERCENT/100);
  const stopDistanceUSDT = price * (STOP_LOSS_PCT/100);
  if (stopDistanceUSDT <= 0) return 0;
  let qty = riskUSDT / stopDistanceUSDT;
  // round down to safe step (this is simplistic — ideally use exchange lotSize filter)
  qty = parseFloat(qty.toFixed(6));
  return qty;
}

/* ---------------- Orders ---------------- */

async function placeMarketOrder(side, qty) {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] market ${side} qty=${qty}`);
    return { simulated: true, side, qty };
  }

  // prepare params
  const params = {
    symbol: SYMBOL,
    side: side.toUpperCase(), // BUY or SELL
    type: 'MARKET',
    quantity: qty,
  };
  // sign and send
  try {
    const res = await signedRequest('/api/v3/order', params, 'POST');
    return res.data;
  } catch (err) {
    console.error('Order error:', err.response?.data || err.message);
    throw err;
  }
}

/* ---------------- Main Loop ---------------- */

let running = false;
async function runOnce() {
  if (running) return;
  running = true;
  try {
    // 1) get klines
    const kl = await publicGet('/api/v3/klines', { symbol: SYMBOL, interval: INTERVAL, limit: KLIMIT });
    const data = kl.data;
    // parse arrays
    const closes = data.map(c => parseFloat(c[4]));
    const highs = data.map(c => parseFloat(c[2]));
    const lows = data.map(c => parseFloat(c[3]));
    const price = closes[closes.length-1];

    // indicators
    const emaAll = calcEMA(closes, 21);
    const ema21 = emaAll.length ? emaAll[emaAll.length-1] : null;
    const sma50arr = calcSMA(closes, 50);
    const sma50 = sma50arr.length ? sma50arr[sma50arr.length-1] : null;
    const rsiArr = calcRSI(closes, 14);
    const rsi14 = rsiArr.length ? rsiArr[rsiArr.length-1] : null;
    const atrArr = calcATR(highs, lows, closes, 14);
    const atrLatest = atrArr.length ? atrArr[atrArr.length-1] : null;

    const indicators = { ema21, sma50, rsi14, atrLatest };
    printStatus(price, indicators);

    const signal = generateSignal(price, indicators);
    console.log("Signal:", signal);

    if (signal === 'buy' && !isOpened) {
      // calc qty
      const qty = calcQtyByRisk(price);
      if (qty <= 0) {
        console.log("Qty calculada é 0 — verificar parâmetros de risco/capital/stop.");
      } else {
        console.log(`Enviar ordem BUY qty=${qty} (price ${price})`);
        const orderRes = await placeMarketOrder('BUY', qty);
        console.log("Order result:", orderRes);
        // compute stop and tp
        const stopPrice = price * (1 - STOP_LOSS_PCT/100);
        const tpPrice = price * (1 + TAKE_PROFIT_PCT/100);
        isOpened = true;
        currentPosition = {
          side: 'BUY',
          entryPrice: price,
          qty,
          stopPrice,
          tpPrice,
          openedAt: Date.now()
        };
        console.log("Posição aberta:", currentPosition);
      }
    } else if (signal === 'sell' && isOpened && currentPosition) {
      // close position
      const qty = currentPosition.qty;
      console.log(`Enviar ordem SELL qty=${qty} para fechar posição`);
      const orderRes = await placeMarketOrder('SELL', qty);
      console.log("Order result:", orderRes);
      isOpened = false;
      console.log("Posição fechada.");
      currentPosition = null;
    } else {
      console.log("Nenhuma ação (hold).");
    }

  } catch (err) {
    console.error("Erro no loop:", err.response?.data || err.message || err);
  } finally {
    running = false;
  }
}

// loop
setInterval(runOnce, LOOP_MS);
runOnce();
