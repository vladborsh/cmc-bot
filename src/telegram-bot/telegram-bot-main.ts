import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../env-config';
import { DynamicConfig } from '../dynamic-config';
import { handleCoinDataCommand } from './telegram-bot-helpers';
import { replyMarkup } from './tg-bot-configs';

export function runTelegramBot(envConfig: EnvConfig, dynamicConfig: DynamicConfig) {
  if (!envConfig.TG_TOKEN) {
    console.error('TG token was not provided');
    return;
  }

  const bot = new TelegramBot(envConfig.TG_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Welcome to my bot! Type /data to get CMC data.', {
      reply_markup: replyMarkup,
    });
  });

  bot.onText(
    /(Price change 24h|Price change 7d|Volume change 24h)/,
    async (command: TelegramBot.Message) => {
      console.log(`[${command.date}] ${command.text}`);

      if (!command.text) {
        return;
      }

      try {
        await handleCoinDataCommand(bot, command, envConfig, dynamicConfig);
      } catch (error) {
        console.error('Error while handling coin data command:', error);
      }
    }
  );
}

