// ===============================
// BOT DE TRADING AUTOMATIZADO BINANCE TESTNET
// ===============================

const axios = require("axios");

// ===============================
// CONFIGURAÇÕES GERAIS
// ===============================
const SYMBOL = "BTCUSDT";                   // Par de moedas
const INTERVAL = "15m";                     // Intervalo de candles
const LIMIT = 21;                           // Número de candles para cálculo do SMA
const API_URL = "https://testnet.binance.vision"; // URL da Binance Testnet (para testes)
const POLLING_TIME = 5000;                  // Intervalo entre verificações (ms)

// ===============================
// ESTRATÉGIA
// ===============================
const BUY_THRESHOLD = 0.98;   // Compra se preço cair 2% abaixo da SMA
const SELL_THRESHOLD = 1.02;  // Vende se preço subir 2% acima da SMA

let positionOpen = false;     // Estado da posição atual (true = comprado, false = fora do mercado)

// ===============================
// FUNÇÃO: Calcular SMA (Simple Moving Average)
// ===============================
function calculateSMA(data) {
    const closes = data.map(candle => parseFloat(candle[4])); // Pega preço de fechamento
    const sum = closes.reduce((a, b) => a + b, 0);
    return sum / closes.length;
}

// ===============================
// FUNÇÃO PRINCIPAL: Coleta dados e executa lógica da estratégia
// ===============================
async function runBot() {
    try {
        // 1️⃣ Obtém candles da Binance
        const response = await axios.get(`${API_URL}/api/v3/klines`, {
            params: {
                symbol: SYMBOL,
                interval: INTERVAL,
                limit: LIMIT
            }
        });

        const candles = response.data;
        const lastCandle = candles[candles.length - 1];
        const currentPrice = parseFloat(lastCandle[4]);
        const sma = calculateSMA(candles);

        // 2️⃣ Exibe dados no console
        console.clear();
        console.log("===== BOT DE TRADING - BINANCE TESTNET =====");
        console.log(`Símbolo: ${SYMBOL}`);
        console.log(`Preço Atual: ${currentPrice.toFixed(2)}`);
        console.log(`SMA (${LIMIT}): ${sma.toFixed(2)}`);
        console.log(`Posição Aberta: ${positionOpen ? "🟢 COMPRADO" : "🔴 FORA"}`);

        // 3️⃣ Lógica da Estratégia
        if (currentPrice <= sma * BUY_THRESHOLD && !positionOpen) {
            console.log("📈 Sinal de COMPRA detectado!");
            positionOpen = true;
            // Aqui você pode integrar uma ordem real futuramente (compra simulada)
        } 
        else if (currentPrice >= sma * SELL_THRESHOLD && positionOpen) {
            console.log("📉 Sinal de VENDA detectado!");
            positionOpen = false;
            // Aqui você pode integrar uma ordem real futuramente (venda simulada)
        } 
        else {
            console.log("⏳ Aguardando oportunidade...");
        }

        console.log("============================================");

    } catch (error) {
        console.error("❌ Erro ao obter dados:", error.message);
    }
}

// ===============================
// EXECUÇÃO AUTOMÁTICA
// ===============================
runBot();                           // Executa uma vez ao iniciar
setInterval(runBot, POLLING_TIME);  // Roda a cada X segundos
