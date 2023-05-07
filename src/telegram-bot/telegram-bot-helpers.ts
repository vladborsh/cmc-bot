import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../env-config';
import { DynamicConfig } from '../dynamic-config';
import { Requests } from '../requests';
import { MarketDataMapper } from '../market-data-mapper';
import { CryptopanicNewsMapper } from '../cryptopanic-news-mapper';
import { BinanceTimeIntervals, BotCommands, CapComTimeIntervals } from '../enums';
import { processDayTradingSelectionForMessage } from '../formatting';
import { BinanceClient } from '../exchange/binance-client';
import { ChartSnapshot } from '../exchange/chart-snaphot';
import { replyMarkup } from './tg-bot-configs';
import { CapitalComClient } from '../exchange/capital-com-client';
import { SessionKeys } from '../interfaces/capital-com.interfaces';

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
  const chartSnapshot = new ChartSnapshot();

  const capitalComClient = new CapitalComClient(EnvConfig.getInstance());
  const session = await capitalComClient.startSession();

  await sendSelectionMessage(bot, command.chat.id, selection);
  await sendBinanceCharts(bot, command.chat.id, envConfig, selection, chartSnapshot);
  await sendNews(bot, command.chat.id, requests, selection, cryptopanicNewsMapper);
  await sendSNP500Data(bot, command.chat.id, capitalComClient, session, chartSnapshot);
  await sendDXYData(bot, command.chat.id, capitalComClient, session, chartSnapshot);
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
  selection: any[],
  chartSnapshot: ChartSnapshot,
) {
  const symbolNames = selection.map((listing) => `${listing.symbol}USDT`);
  const binanceClient = await BinanceClient.getInstance(envConfig);

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
      const rawChart = await binanceClient.getCandles(symbol, BinanceTimeIntervals.ONE_HOUR, 80);
      const img = await chartSnapshot.generateImage(BinanceClient.prepareChartData(rawChart), 80);
      await bot.sendPhoto(chatId, img, { caption: `${symbol} price chart` });
    } catch (e) {
      console.error(`error during chart image generation: ${symbol}`);
      console.log(e);
    }
  }
}

async function sendDXYData(
  bot: TelegramBot,
  chatId: number,
  capitalComClient: CapitalComClient,
  session: SessionKeys,
  chartSnapshot: ChartSnapshot,
) {
  try {
    const marketData = await capitalComClient.getDXY(session, CapComTimeIntervals.HOUR, 80);

    const img = await chartSnapshot.generateImage(
      CapitalComClient.prepareChartData(marketData),
      80
    );
    await bot.sendPhoto(chatId, img, { caption: `DXY price chart` });
  } catch (e) {
    console.error(`error during chart image generation: DXY`);
    console.log(e);
  }
}

async function sendSNP500Data(
  bot: TelegramBot,
  chatId: number,
  capitalComClient: CapitalComClient,
  session: SessionKeys,
  chartSnapshot: ChartSnapshot,
) {
  try {
    const marketData = await capitalComClient.getSNP(session, CapComTimeIntervals.HOUR, 80);

    const img = await chartSnapshot.generateImage(
      CapitalComClient.prepareChartData(marketData),
      80
    );
    await bot.sendPhoto(chatId, img, { caption: `SNP 500 price chart` });
  } catch (e) {
    console.error(`error during chart image generation: SNP 500`);
    console.log(e);
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
