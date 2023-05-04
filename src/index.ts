import express from 'express';
import { config } from 'dotenv';
import { EnvConfig } from './env-config';
import { DynamicConfig } from './dynamic-config';
import { runTelegramBot } from './telegram-bot';
import { selectDayTradingFromMarket } from './requests';

if (process.argv.includes('--local')) {
  config();
}

const envConfig = EnvConfig.getInstance();

const dynamicConfig = DynamicConfig.getInstance(envConfig);

// ----------------------------------
// Heroku requires port for listening
// ----------------------------------
const app = express();
app.listen(envConfig.port, () => {
  console.log(`\n\nServer running on port ${envConfig.port}.\n\n`);
});
// ----------------------------------

async function get24hSelection() {
  const omitTokens = await dynamicConfig.getOmitTokens();
  const selection = await selectDayTradingFromMarket('Intra day (24h sort)', omitTokens, envConfig);
  console.log(selection);
}

if (process.argv.includes('--no-bot')) {
  get24hSelection();
} else {
  runTelegramBot(envConfig, dynamicConfig);
}
