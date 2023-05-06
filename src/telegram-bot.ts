import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from './env-config';
import { DynamicConfig } from './dynamic-config';
import { getNews, selectDayTradingFromMarket } from './requests';
import { CryptopanicNewsMapper } from './cryptopanic-news-mapper';
import { BotCommands } from './enums';
import { MarketDataMapper } from './market-data-mapper';
import { processDayTradingSelectionForMessage } from './formatting';

export function runTelegramBot(envConfig: EnvConfig, dynamicConfig: DynamicConfig) {
  if (!envConfig.TG_TOKEN) {
    console.error('TG token was not provided');
    return;
  }

  const bot = new TelegramBot(envConfig.TG_TOKEN, { polling: true });

  const replyMarkup = {
    keyboard: [
      [
        { text: BotCommands.price24h },
        { text: BotCommands.price7d },
        { text: BotCommands.volume24h },
      ]
    ],
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

    const config = await dynamicConfig.getConfig();
    const marketDataMapper = new MarketDataMapper(config);
    const cryptopanicNewsMapper = new CryptopanicNewsMapper(config);
    const marketData = await selectDayTradingFromMarket(envConfig);
    const selection = marketDataMapper.filterAndSortCoins(marketData, command.text);

    const coinTechMessage = processDayTradingSelectionForMessage(selection);

    bot.sendMessage(command.chat.id, coinTechMessage, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        remove_keyboard: true,
      },
    });

    const newsByAsset = await getNews(
      selection.map((listing) => listing.symbol),
      envConfig
    );

    try {
      const coinNewsMessage = cryptopanicNewsMapper.processDayTradingNews(newsByAsset);

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
