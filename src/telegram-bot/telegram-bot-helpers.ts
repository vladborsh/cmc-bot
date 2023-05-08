import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../env-config';
import { Requests } from '../requests';
import { MarketDataMapper } from '../market-data-mapper';
import { CryptopanicNewsMapper } from '../cryptopanic-news-mapper';
import { BinanceTimeIntervals, BotCommands, CapComTimeIntervals } from '../enums';
import { processDayTradingSelectionForMessage } from '../formatting';
import { BinanceClient } from '../exchange/binance-client';
import { ChartSnapshot } from '../exchange/chart-snaphot';
import { CapitalComClient } from '../exchange/capital-com-client';
import { DynamicConfigValues } from '../interfaces/dynamic-config.interface';
import { MappedListing } from '../interfaces/mapped-listing.interface';

export class TelegramBotActions {
  marketDataMapper: MarketDataMapper;
  requests: Requests;
  cryptopanicNewsMapper: CryptopanicNewsMapper;
  chartSnapshot: ChartSnapshot;
  selection: MappedListing[] | undefined;
  defaultMarkup = {
    keyboard: [[{ text: BotCommands.topCrypto }, { text: BotCommands.indices }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  constructor(
    private bot: TelegramBot,
    private envConfig: EnvConfig,
    dynamicConfig: DynamicConfigValues
  ) {
    this.bot = bot;
    this.marketDataMapper = new MarketDataMapper(dynamicConfig);
    this.requests = new Requests(envConfig);
    this.cryptopanicNewsMapper = new CryptopanicNewsMapper(dynamicConfig);
    this.chartSnapshot = new ChartSnapshot();
  }

  sendInitialMessage(chatId: number) {
    this.bot.sendMessage(
      chatId,
      `What we gonna do now? I can show you top Crypto currency selection for intraday trading or show important Indices info`,
      {
        reply_markup: {
          keyboard: [[{ text: BotCommands.topCrypto }, { text: BotCommands.indices }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }

  sendCryptoSortingMessage(chatId: number) {
    this.bot.sendMessage(chatId, `What sorting do you prefer?`, {
      reply_markup: {
        keyboard: [
          [
            { text: BotCommands.volume24h },
            { text: BotCommands.price7d },
            { text: BotCommands.price24h },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  askAboutNews(chatId: number) {
    this.bot.sendMessage(chatId, `Do you want to see related to these currencies news?`, {
      reply_markup: {
        keyboard: [[{ text: BotCommands.yesShowNews }, { text: BotCommands.noDoNotShowNews }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  async selectCrypto(chatId: number, command: TelegramBot.Message) {
    const marketData = await this.requests.selectDayTradingFromMarket();
    const selection = this.marketDataMapper.filterAndSortCoins(
      marketData,
      command.text as BotCommands
    );
    this.selection = selection;
    await this.bot.sendMessage(chatId, processDayTradingSelectionForMessage(selection), {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        remove_keyboard: true,
      },
    });
    await this.bot.sendMessage(chatId, `Shell I draw those charts?`, {
      reply_markup: {
        keyboard: [[{ text: BotCommands.yesDrawCharts }, { text: BotCommands.noDoNotDraw }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  async renderCryptoCharts(chatId: number) {
    if (!this.selection) {
      await this.bot.sendMessage(chatId, `Sorry, there is no selected currency, please try again`);
      return;
    }

    const symbolNames = this.selection.map((listing) => `${listing.symbol}USDT`);
    const binanceClient = await BinanceClient.getInstance(this.envConfig);

    let count = 0;

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
        const img = await this.chartSnapshot.generateImage(
          BinanceClient.prepareChartData(rawChart),
          80
        );
        await this.bot.sendPhoto(chatId, img, { caption: `${symbol} price chart` });
        count++;
      } catch (e) {
        console.error(`error during chart image generation: ${symbol}`);
        console.log(e);
      }
    }

    console.log('renderCryptoCharts end')
    if (count === 0) {
      await this.bot.sendMessage(chatId, `Looks like those currency are not present on Binance`);
    }
  }

  async selectNews(chatId: number) {
    if (!this.selection) {
      await this.bot.sendMessage(chatId, `Sorry, there is no selected currency, please try again`, {
        reply_markup: this.defaultMarkup,
      });
      return;
    }

    const newsByAsset = await this.requests.getNews(
      this.selection.map((listing) => listing.symbol)
    );

    if (!Object.keys(newsByAsset).length) {
      this.bot.sendMessage(chatId, `There is not important news 🤷‍♂️`, {
        reply_markup: this.defaultMarkup,
      });
      return;
    }

    try {
      const coinNewsMessage = this.cryptopanicNewsMapper.processDayTradingNews(newsByAsset);

      this.bot.sendMessage(chatId, coinNewsMessage, {
        parse_mode: 'MarkdownV2',
        reply_markup: this.defaultMarkup,
        disable_web_page_preview: true,
      });
    } catch (e) {
      await this.bot.sendMessage(chatId, `Can't retrieve news at the moment 🤷‍♂️`, {
        reply_markup: this.defaultMarkup,
      });
    }
  }

  async renderIndicesCharts(chatId: number) {
    const capitalComClient = new CapitalComClient(EnvConfig.getInstance());
    const session = await capitalComClient.startSession();

    try {
      const marketDataSNP = await capitalComClient.getSNP(session, CapComTimeIntervals.HOUR, 80);
      const marketData = await capitalComClient.getDXY(session, CapComTimeIntervals.HOUR, 80);

      const imgSNP = await this.chartSnapshot.generateImage(
        CapitalComClient.prepareChartData(marketDataSNP),
        80
      );

      const imgDXY = await this.chartSnapshot.generateImage(
        CapitalComClient.prepareChartData(marketData),
        80
      );
      await this.bot.sendPhoto(chatId, imgSNP, { caption: `DXY price chart` });
      await this.bot.sendPhoto(chatId, imgDXY, { caption: `SNP 500 price chart` });
    } catch (e) {
      console.error(`error during chart indices chart generation`);
      console.log(e);
      await this.bot.sendMessage(chatId, `Somethings goes wrong with indices request`);
    }
  }
}
