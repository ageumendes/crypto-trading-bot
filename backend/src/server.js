const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ccxt = require('ccxt');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Inicializar SQLite
const db = new sqlite3.Database('./trades.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao SQLite:', err.message);
    process.exit(1); // Encerra o processo em caso de erro
  } else {
    console.log('Conectado ao SQLite');
    // Criar tabela trades
    db.run(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT,
        side TEXT,
        quantity REAL,
        price REAL,
        timestamp TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Erro ao criar tabela trades:', err.message);
        process.exit(1);
      }
      console.log('Tabela trades criada ou já existe');
      // Criar tabela configs
      db.run(`
        CREATE TABLE IF NOT EXISTS configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT,
          targetProfit REAL,
          quantity REAL,
          stopLoss REAL
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar tabela configs:', err.message);
          process.exit(1);
        }
        console.log('Tabela configs criada ou já existe');
      });
    });
  }
});

// Inicializar Binance com ccxt (Testnet)
const binance = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET_KEY,
  enableRateLimit: true,
  urls: {
    api: {
      spot: 'https://testnet.binance.vision/api',
    },
  },
});

// Verificar autenticação ao iniciar
async function verifyAuthentication() {
  try {
    const balance = await binance.fetchBalance();
    console.log('Autenticação bem-sucedida. Saldo disponível:', balance.free);
  } catch (error) {
    console.error('Falha na autenticação:', error.message);
  }
}
verifyAuthentication();

// WebSocket para preços em tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  const sendPriceUpdates = async (symbol) => {
    try {
      const markets = await binance.loadMarkets();
      if (!markets[symbol]) {
        console.error(`Símbolo ${symbol} não encontrado para WebSocket`);
        return;
      }
      while (true) {
        try {
          const ticker = await binance.fetchTicker(symbol);
          socket.emit('priceUpdate', { symbol, price: ticker.last });
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error('Erro ao buscar preço:', error.message);
          break;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mercados para WebSocket:', error.message);
    }
  };

  socket.on('subscribePrice', (symbol) => {
    sendPriceUpdates(symbol);
  });
});

// Endpoint para configurar o bot
app.post('/api/config', (req, res) => {
  const { symbol, targetProfit, quantity, stopLoss } = req.body;
  db.run(
    `INSERT OR REPLACE INTO configs (id, symbol, targetProfit, quantity, stopLoss) VALUES (1, ?, ?, ?, ?)`,
    [symbol, targetProfit, quantity, stopLoss],
    (err) => {
      if (err) {
        console.error('Erro ao salvar configuração:', err.message);
        return res.status(500).json({ error: 'Erro ao salvar configuração', details: err.message });
      }
      res.json({ message: 'Configuração salva', config: { symbol, targetProfit, quantity, stopLoss } });
    }
  );
});

// Endpoint para verificar símbolos
app.get('/api/markets', async (req, res) => {
  try {
    const markets = await binance.loadMarkets();
    res.json(Object.keys(markets));
  } catch (error) {
    console.error('Erro ao carregar mercados:', error.message);
    res.status(500).json({ error: 'Erro ao carregar mercados', details: error.message });
  }
});

// Endpoint para consultar saldos
app.get('/api/balances', async (req, res) => {
  try {
    const balance = await binance.fetchBalance();
    const balances = Object.keys(balance.free)
      .filter(currency => balance.free[currency] > 0)
      .map(currency => ({
        currency,
        amount: balance.free[currency],
      }));
    res.json(balances);
  } catch (error) {
    console.error('Erro ao consultar saldos:', error.message);
    res.status(500).json({ error: 'Erro ao consultar saldos', details: error.message });
  }
});

// Endpoint para trade manual
app.post('/api/trade', async (req, res) => {
  const { symbol, side, quantity } = req.body;
  try {
    console.log('Recebido trade:', { symbol, side, quantity });
    const markets = await binance.loadMarkets();
    if (!markets[symbol]) {
      throw new Error(`Símbolo ${symbol} não encontrado na Binance`);
    }
    const market = markets[symbol];
    const ticker = await binance.fetchTicker(symbol);
    const price = ticker.last;

    // Verificar saldo
    const balance = await binance.fetchBalance();
    const baseCurrency = symbol.split('/')[1]; // ex.: USDT
    const quoteCurrency = symbol.split('/')[0]; // ex.: DOGE
    if (side === 'buy' && balance.free[baseCurrency] < quantity * price) {
      throw new Error(`Saldo insuficiente em ${baseCurrency} para compra`);
    }
    if (side === 'sell' && balance.free[quoteCurrency] < quantity) {
      throw new Error(`Saldo insuficiente em ${quoteCurrency} para venda`);
    }

    // Verificar quantidade mínima
    const minQuantity = market.limits.amount.min;
    if (quantity < minQuantity) {
      throw new Error(`Quantidade mínima para ${symbol} é ${minQuantity}`);
    }

    // Verificar valor mínimo da ordem (~$10)
    const minOrderValue = 1;
    if (side === 'buy' && quantity * price < minOrderValue) {
      throw new Error(`Valor da ordem deve ser pelo menos $${minOrderValue} USDT`);
    }

    const order = await binance.createMarketOrder(symbol, side, quantity);
    db.run(
      `INSERT INTO trades (symbol, side, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [symbol, side, quantity, price, new Date().toISOString()],
      (err) => {
        if (err) {
          console.error('Erro ao salvar trade:', err.message);
        }
      }
    );
    res.json({ message: `Ordem ${side} executada com sucesso`, order });
  } catch (error) {
    console.error('Erro no endpoint /api/trade:', error.message, error.stack);
    res.status(500).json({ error: 'Erro ao executar trade', details: error.message });
  }
});

// Estratégia de trading automática
async function tradingBot() {
  const periods = 20;
  let prices = [];
  let buyPrice = null;

  try {
    // Aguardar criação das tabelas antes de consultar
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Pequeno atraso para garantir criação
    const config = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM configs WHERE id = 1`, (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    if (!config) {
      console.error('Nenhuma configuração encontrada. Configure o bot via /api/config');
      return;
    }
    const { symbol, targetProfit, quantity, stopLoss } = config;

    const markets = await binance.loadMarkets();
    if (!markets[symbol]) {
      console.error(`Símbolo ${symbol} não encontrado para trading bot`);
      return;
    }
    const market = markets[symbol];
    if (quantity < market.limits.amount.min) {
      console.error(`Quantidade ${quantity} abaixo do mínimo ${market.limits.amount.min} para ${symbol}`);
      return;
    }

    while (true) {
      try {
        const ohlcv = await binance.fetchOHLCV(symbol, '1h', undefined, periods);
        prices = ohlcv.map(candle => candle[4]);

        const sma = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const currentPrice = prices[prices.length - 1];

        if (!buyPrice && currentPrice < sma * 0.98 && prices.length >= periods) {
          const balance = await binance.fetchBalance();
          const baseCurrency = symbol.split('/')[1];
          if (balance.free[baseCurrency] < quantity * currentPrice) {
            console.error(`Saldo insuficiente em ${baseCurrency} para compra automática`);
            continue;
          }
          const order = await binance.createMarketOrder(symbol, 'buy', quantity);
          buyPrice = currentPrice;
          console.log('Compra executada:', order);
          db.run(
            `INSERT INTO trades (symbol, side, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [symbol, 'buy', quantity, currentPrice, new Date().toISOString()],
            (err) => {
              if (err) console.error('Erro ao salvar trade:', err.message);
            }
          );
        }

        if (buyPrice) {
          if (currentPrice >= buyPrice * (1 + targetProfit / 100)) {
            const sellOrder = await binance.createMarketOrder(symbol, 'sell', quantity);
            console.log('Venda executada com lucro:', sellOrder);
            db.run(
              `INSERT INTO trades (symbol, side, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?)`,
              [symbol, 'sell', quantity, currentPrice, new Date().toISOString()],
              (err) => {
                if (err) console.error('Erro ao salvar trade:', err.message);
              }
            );
            buyPrice = null;
          }
          else if (currentPrice <= buyPrice * (1 - stopLoss / 100)) {
            const sellOrder = await binance.createMarketOrder(symbol, 'sell', quantity);
            console.log('Venda executada por stop-loss:', sellOrder);
            db.run(
              `INSERT INTO trades (symbol, side, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?)`,
              [symbol, 'sell', quantity, currentPrice, new Date().toISOString()],
              (err) => {
                if (err) console.error('Erro ao salvar trade:', err.message);
              }
            );
            buyPrice = null;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 60000));
      } catch (error) {
        console.error('Erro no bot:', error.message);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  } catch (error) {
    console.error('Erro ao iniciar trading bot:', error.message);
  }
}

// Iniciar o bot após garantir que o banco está pronto
setTimeout(() => tradingBot(), 2000); // Atraso para garantir criação das tabelas

server.listen(3000, () => {
  console.log('Backend rodando na porta 3000');
});