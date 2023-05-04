import TelegramBot from "node-telegram-bot-api";
import { EnvConfig } from "./env-config";
import { DynamicConfig } from "./dynamic-config";
import { getNews, selectDayTradingFromMarket } from "./requests";
import { processDayTradingNews, processDayTradingSelectionForMessage } from "./formatting";

export function runTelegramBot(envConfig: EnvConfig, dynamicConfig: DynamicConfig) {
  if (!envConfig.telegramToken) {
    console.error('TG token was not provided');
    return;
  }

  const bot = new TelegramBot(envConfig.telegramToken, { polling: true });

  const replyMarkup = {
    keyboard: [[{ text: 'Intra day (24h sort)' }, { text: 'Intra day (7d sort)' }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Welcome to my bot! Type /data to get CMC data.', {
      reply_markup: replyMarkup,
    });
  });

  bot.onText(/[coin_data_24h,coin_data_7d]/, async (command) => {
    console.log(`[${command.date}] ${command.text}`);

    if (!command.text) {
      return;
    }

    const omitTokens = await dynamicConfig.getOmitTokens();
    const selection = await selectDayTradingFromMarket(command.text, omitTokens, envConfig);
    const coinTechMessage = processDayTradingSelectionForMessage(selection);

    bot.sendMessage(command.chat.id, coinTechMessage, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        remove_keyboard: true,
      },
    });

    const newsByAsset = await getNews(selection.map((listing) => listing.symbol), envConfig);

    try {
      const coinNewsMessage = processDayTradingNews(newsByAsset);

      bot.sendMessage(command.chat.id, coinNewsMessage, {
        parse_mode: 'MarkdownV2',
        reply_markup: replyMarkup,
        disable_web_page_preview: true,
      });
    } catch (e) {
      bot.sendMessage(command.chat.id, `Can't retrieve news at the moment 🤷‍♂️`, {
        parse_mode: 'MarkdownV2',
        reply_markup: replyMarkup,
        disable_web_page_preview: true,
      });
    }
  });
}
