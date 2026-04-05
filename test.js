// ===========================================
// BOT DE TRADING - SIMULAÇÃO COM DASHBOARD
// Autor: Christopher Kawan
// ===========================================

const axios = require("axios");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.static("public"));

// ===============================
// CONFIGURAÇÕES
// ===============================
const SYMBOL = "BTCUSDT";
const INTERVAL = "15m";
const LIMIT = 21;
const API_URL = "https://testnet.binance.vision";
const POLLING_TIME = 8000; // 8s

// ===============================
// ESTRATÉGIA
// ===============================
const BUY_THRESHOLD = 0.98;
const SELL_THRESHOLD = 1.02;
const TRADE_AMOUNT = 0.001;

let positionOpen = false;
let entryPrice = 0;
let balanceUSDT = 1000;
let balanceBTC = 0;
let profitTotal = 0;

// ===============================
// FUNÇÕES AUXILIARES
// ===============================
function calculateSMA(data) {
  const closes = data.map(c => parseFloat(c[4]));
  const sum = closes.reduce((a, b) => a + b, 0);
  return sum / closes.length;
}

function saveData(payload) {
  fs.writeFileSync("data.json", JSON.stringify(payload, null, 2));
}

// ===============================
// LÓGICA PRINCIPAL
// ===============================
async function runBot() {
  try {
    const response = await axios.get(`${API_URL}/api/v3/klines`, {
      params: { symbol: SYMBOL, interval: INTERVAL, limit: LIMIT },
    });

    const candles = response.data;
    const lastCandle = candles[candles.length - 1];
    const currentPrice = parseFloat(lastCandle[4]);
    const sma = calculateSMA(candles);

    // Estratégia
    let action = "Aguardar";

    if (currentPrice <= sma * BUY_THRESHOLD && !positionOpen) {
      // Compra
      const cost = TRADE_AMOUNT * currentPrice;
      if (balanceUSDT >= cost) {
        balanceUSDT -= cost;
        balanceBTC += TRADE_AMOUNT;
        positionOpen = true;
        entryPrice = currentPrice;
        action = "Comprar";
      }
    } else if (currentPrice >= sma * SELL_THRESHOLD && positionOpen) {
      // Venda
      const revenue = TRADE_AMOUNT * currentPrice;
      balanceUSDT += revenue;
      balanceBTC -= TRADE_AMOUNT;

      const profit = (currentPrice - entryPrice) * TRADE_AMOUNT;
      profitTotal += profit;
      positionOpen = false;
      action = "Vender";
    }

    const logData = {
      timestamp: new Date().toISOString(),
      price: currentPrice,
      sma,
      action,
      balanceUSDT,
      balanceBTC,
      profitTotal,
      positionOpen,
    };

    saveData(logData);
    console.clear();
    console.log("=== BOT RODANDO ===");
    console.log(`Preço: ${currentPrice.toFixed(2)} USDT`);
    console.log(`SMA: ${sma.toFixed(2)}`);
    console.log(`Ação: ${action}`);
    console.log(`Lucro total: ${profitTotal.toFixed(2)} USDT`);

  } catch (error) {
    console.error("Erro:", error.message);
  }
}

// ===============================
// LOOP E SERVIDOR
// ===============================
setInterval(runBot, POLLING_TIME);
runBot();

// Endpoint para o dashboard buscar dados
app.get("/data", (req, res) => {
  try {
    const data = fs.existsSync("data.json")
      ? JSON.parse(fs.readFileSync("data.json", "utf-8"))
      : {};
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao ler data.json" });
  }
});

// Inicia servidor local
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Dashboard disponível em http://localhost:${PORT}`));
