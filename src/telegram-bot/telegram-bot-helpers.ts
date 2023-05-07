import TelegramBot from "node-telegram-bot-api";
import { EnvConfig } from "../env-config";
import { DynamicConfig } from "../dynamic-config";
import { Requests } from "../requests";
import { MarketDataMapper } from "../market-data-mapper";
import { CryptopanicNewsMapper } from "../cryptopanic-news-mapper";
import { BotCommands } from "../enums";
import { processDayTradingSelectionForMessage } from "../formatting";
import { BinanceClient } from "../exchange/binance-client";
import { BinanceChartSnapshot } from "../exchange/binance-chart-snaphot";
import { replyMarkup } from "./tg-bot-configs";

export async function handleCoinDataCommand(
  bot: TelegramBot,
  command: TelegramBot.Message,
  envConfig: EnvConfig,
  dynamicConfig: DynamicConfig
) {
  const config = await dynamicConfig.getConfig();
  const requests = new Requests(envConfig);
  const marketDataMapper = new MarketDataMapper(config);
  const cryptopanicNewsMapper = new CryptopanicNewsMapper(config);
  const marketData = await requests.selectDayTradingFromMarket();
  const selection = marketDataMapper.filterAndSortCoins(marketData, command.text as BotCommands);

  await sendSelectionMessage(bot, command.chat.id, selection);
  await sendBinanceCharts(bot, command.chat.id, envConfig, selection);
  await sendNews(bot, command.chat.id, requests, selection, cryptopanicNewsMapper);
}

async function sendSelectionMessage(bot: TelegramBot, chatId: number, selection: any[]) {
  bot.sendMessage(chatId, processDayTradingSelectionForMessage(selection), {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      remove_keyboard: true,
    },
  });
}

async function sendBinanceCharts(
  bot: TelegramBot,
  chatId: number,
  envConfig: EnvConfig,
  selection: any[]
) {
  const symbolNames = selection.map((listing) => `${listing.symbol}USDT`);

  const binanceClient = await BinanceClient.getInstance(envConfig);
  const binanceChartSnapshot = new BinanceChartSnapshot(binanceClient);

  for (let symbol of symbolNames) {
    try {
      if (!BinanceClient.isSymbolExists(symbol)) {
        continue;
      }
    } catch (e) {
      console.error(e);
      break;
    }

    console.log(`load chart for ${symbol}...`);

    try {
      const img = await binanceChartSnapshot.generateImage(symbol, '1h', 80);
      await bot.sendPhoto(chatId, img, { caption: `${symbol} price chart` });
    } catch (e) {
      console.error('error during chart image generation');
      console.log(e);
    }
  }
}

async function sendNews(
  bot: TelegramBot,
  chatId: number,
  requests: Requests,
  selection: any[],
  cryptopanicNewsMapper: CryptopanicNewsMapper
) {
  const newsByAsset = await requests.getNews(selection.map((listing) => listing.symbol));

  try {
    const coinNewsMessage = cryptopanicNewsMapper.processDayTradingNews(newsByAsset);

    bot.sendMessage(chatId, coinNewsMessage, {
      parse_mode: 'MarkdownV2',
      reply_markup: replyMarkup,
      disable_web_page_preview: true,
    });
  } catch (e) {
    bot.sendMessage(chatId, `Can't retrieve news at the moment 🤷‍♂️`, {
      parse_mode: 'MarkdownV2',
      reply_markup: replyMarkup,
      disable_web_page_preview: true,
    });
  }
}
