const ccxt = require('ccxt');
require('dotenv').config();

async function testBinance() {
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
  try {
    console.log('Testando autenticação...');
    const balance = await binance.fetchBalance();
    console.log('Saldo disponível:', balance.free);
    console.log('Carregando mercados...');
    const markets = await binance.loadMarkets();
    console.log('Mercados disponíveis (exemplo):', Object.keys(markets).slice(0, 10));
    console.log('Símbolo DOGE/USDT existe:', !!markets['DOGE/USDT']);
    console.log('Testando preço...');
    const ticker = await binance.fetchTicker('DOGE/USDT');
    console.log('Preço atual de DOGE/USDT:', ticker.last);
    console.log('Verificando quantidade mínima para DOGE/USDT...');
    const market = markets['DOGE/USDT'];
    console.log('Quantidade mínima:', market.limits.amount.min);
    console.log('Testando ordem fictícia (dry run)...');
    const order = await binance.createMarketOrder('DOGE/USDT', 'buy', 100, { dryRun: true });
    console.log('Ordem fictícia criada com sucesso:', order);
  } catch (error) {
    console.error('Erro:', error.message, error.stack);
  }
}

testBinance();