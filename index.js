const crypto = require("crypto");
const axios = require("axios");

const SYMBOL = "BTCUSDT";
const BUY_PRICE = 34160;
const SELL_PRICE = 34501;
const QUANTITY = 0.001;
const API_KEY = "IB8q2dEilYDazXUEFM5xLQsh7NnaBZw8LFcOeLr4kRpyz6Thudhlsh7spfMJf3k0";
const SECRET_KEY = "bkaccuoVEAgNxb7SmzhFvPS9Q5hOcwyroFguX08iR68gpLRIgD8xouhFO8JBcuVo";
//
    // API Key: IB8q2dEilYDazXUEFM5xLQsh7NnaBZw8LFcOeLr4kRpyz6Thudhlsh7spfMJf3k0

    // Secret Key: bkaccuoVEAgNxb7SmzhFvPS9Q5hOcwyroFguX08iR68gpLRIgD8xouhFO8JBcuVo

const API_URL = "https://testnet.binance.vision";//https://api.binance.com

let isOpened = false;

function calcSMA(data){
    const closes = data.map(candle => parseFloat(candle[4]));
    const sum = closes.reduce((a,b) => a + b);
    return sum / data.length;
}

async function start() {
    const { data } = await axios.get(API_URL + "/api/v3/klines?limit=21&interval=15m&symbol=" + SYMBOL);
    const candle = data[data.length - 1];
    const price = parseFloat(candle[4]);

    console.clear();
    console.log("Price: " + price);

    const sma = calcSMA(data);
    console.log("SMA: " + sma);
    console.log("Is Opened? " + isOpened);

    if (price <= (sma * 0.9) && isOpened === false) {
        console.log("comprar");
        isOpened = true;
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if (price >= (sma * 1.1) && isOpened === true) {
        console.log("vender");
        newOrder(SYMBOL, QUANTITY, "sell");
        isOpened = false;
        
    }
    else
        console.log("aguardar");
}

async function newOrder(symbol, quantity, side) {
    const order = {symbol, quantity, side};
    order.type = "MARKET";
    order.timestamp = Date.now();
    order.recvWindow = 60000;

    const signature = crypto.createHmac('sha256', SECRET_KEY).update(new URLSearchParams(order).toString()).digest('hex');
    order.signature = signature;

    try {
        const { data } = await axios.post(API_URL + "/api/v3/order", new URLSearchParams(order).toString(), {
            headers: { "X-MBX-APIKEY": API_KEY }
        })
        console.log(data);
    } catch (err) {
        console.error(err.response.data);
    }
}

setInterval(start, 3000);

start();