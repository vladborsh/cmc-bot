import express from 'express';
import { config } from 'dotenv';
import { EnvConfig } from './env-config';
import { DynamicConfig } from './dynamic-config';
import { runTelegramBot } from './telegram-bot';
import { selectDayTradingFromMarket } from './requests';
import { MarketDataMapper } from './market-data-mapper';

if (process.argv.includes('--local')) {
  config();
}

const envConfig = EnvConfig.getInstance();

const dynamicConfig = DynamicConfig.getInstance(envConfig);

// ----------------------------------
// Heroku requires port for listening
// ----------------------------------
const app = express();
app.listen(envConfig.PORT, () => {
  console.log(`\n\nServer running on port ${envConfig.PORT}.\n\n`);
});
// ----------------------------------

async function get24hSelection() {
  const config = await dynamicConfig.getConfig();
  const marketData = await selectDayTradingFromMarket(envConfig);
  const marketDataMapper = new MarketDataMapper(config);
  const selection = marketDataMapper.filterAndSortCoins(marketData, 'Intra day (24h sort)');
  console.log(selection);
}

if (process.argv.includes('--no-bot')) {
  get24hSelection();
} else {
  runTelegramBot(envConfig, dynamicConfig);
}
