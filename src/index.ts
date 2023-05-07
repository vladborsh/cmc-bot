import dotenv from 'dotenv';
import { DynamicConfig } from './dynamic-config';
import { EnvConfig } from './env-config';
import { runTelegramBot } from './telegram-bot/telegram-bot-main';
import { getMarketSelection } from './local-env-helper';
import { BotCommands } from './enums';
import { setupPortListener } from './port-listener';

const isBotEnabled = !process.argv.includes('--no-bot');
const isDotEnvEnabled = process.argv.includes('--local');

if (isDotEnvEnabled) {
  dotenv.config();
}

const envConfig = EnvConfig.getInstance();
const dynamicConfig = DynamicConfig.getInstance(envConfig);

// Heroku requires port for listening
setupPortListener(envConfig);

if (isBotEnabled) {
  runTelegramBot(envConfig, dynamicConfig);
} else {
  getMarketSelection(BotCommands.volume24h, dynamicConfig, envConfig);
}
