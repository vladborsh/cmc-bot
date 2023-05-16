import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../env-config';
import { Requests } from '../requests';
import { MarketDataMapper } from '../market-data-mapper';
import { CryptopanicNewsMapper } from '../cryptopanic-news-mapper';
import { BotCommands, CapComTimeIntervals } from '../enums';
import { processDayTradingSelectionForMessage } from '../formatting';
import { BinanceClient } from '../exchange/binance-client';
import { ChartSnapshot } from '../exchange/chart-snaphot';
import { CapitalComClient } from '../exchange/capital-com-client';
import { DynamicConfigValues } from '../interfaces/dynamic-config.interface';
import { MappedListing } from '../interfaces/mapped-listing.interface';
import { ReplyMarkup } from './interfaces/reply-markup';
import { EMACrossUpIndicator } from '../indicators/ema-crossup-indicator';
import { DynamoDBClient } from '../db/dynamo-db-client';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import { CandleChartInterval_LT } from 'binance-api-node';
import { AssetWatchListProcessor } from '../exchange/asset-watch-list-processor';

export class TelegramBotActions {
  marketDataMapper: MarketDataMapper;
  requests: Requests;
  cryptopanicNewsMapper: CryptopanicNewsMapper;
  chartSnapshot: ChartSnapshot;
  selection: string[] | undefined;
  private DEFAULT_CANDLE_NUMBER = 700;

  static defaultReplyMarkup: ReplyMarkup = {
    reply_markup: {
      keyboard: [
        [{ text: BotCommands.topCrypto }, { text: BotCommands.indices }],
        [{ text: BotCommands.selectCrypto }, { text: BotCommands.watchCrypto }],
        [{ text: BotCommands.btcInfo }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };

  constructor(
    private bot: TelegramBot,
    private envConfig: EnvConfig,
    private assetWatchListProcessor: AssetWatchListProcessor,
    private dynamoDBClient: DynamoDBClient,
    dynamicConfig: DynamicConfigValues,
    selection?: string[]
  ) {
    this.bot = bot;
    this.marketDataMapper = new MarketDataMapper(dynamicConfig);
    this.requests = new Requests(envConfig);
    this.cryptopanicNewsMapper = new CryptopanicNewsMapper(dynamicConfig);
    this.chartSnapshot = new ChartSnapshot();
    this.selection = selection;
  }

  public sendInitialMessage(chatId: number) {
    this.bot.sendMessage(
      chatId,
      `What we gonna do now? I can show you top Crypto currency selection for intraday trading or show important Indices info`,
      TelegramBotActions.defaultReplyMarkup
    );
  }

  public sendCryptoSortingMessage(chatId: number) {
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

  public askAboutNews(chatId: number) {
    this.bot.sendMessage(chatId, `Do you want to see related to these currencies news?`, {
      reply_markup: {
        keyboard: [[{ text: BotCommands.yesShowNews }, { text: BotCommands.noDoNotShowNews }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  public async selectCrypto(chatId: number, command: TelegramBot.Message) {
    const marketData = await this.requests.selectDayTradingFromMarket();
    const selection = this.marketDataMapper.filterAndSortCoins(
      marketData,
      command.text as BotCommands
    );
    this.selection = selection.map((listing) => listing.symbol);
    await DynamoDBClient.getInstance(this.envConfig).updateLastSelectedCrypto(
      chatId.toString(),
      this.selection
    );
    await this.bot.sendMessage(chatId, processDayTradingSelectionForMessage(selection), {
      parse_mode: 'MarkdownV2',
    });
    await this.bot.sendMessage(chatId, `Shall I draw those charts?`, {
      reply_markup: {
        keyboard: [[{ text: BotCommands.yesDrawCharts }, { text: BotCommands.noDoNotDraw }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  public async renderCryptoCharts(chatId: number) {
    if (!this.selection) {
      await this.bot.sendMessage(chatId, `Sorry, there is no selected currency, please try again`);
      return;
    }

    const binanceClient = await BinanceClient.getInstance(this.envConfig);

    let count = 0;

    for (let symbol of this.selection.map((symbol) => `${symbol}USDT`)) {
      try {
        if (!(await BinanceClient.isSymbolExists(symbol))) {
          continue;
        }
      } catch (e) {
        console.error(e);
        break;
      }

      try {
        const candles = await binanceClient.getCandles(symbol, '1h', this.DEFAULT_CANDLE_NUMBER);
        const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
          chartData: candles,
        });
        const img = this.chartSnapshot.generateImage(candles, data || {});
        await this.bot.sendPhoto(chatId, img, { caption: `${symbol} price chart` });
        count++;
      } catch (e) {
        console.error(`error during chart image generation: ${symbol}`);
        console.log(e);
      }
    }

    if (count === 0) {
      await this.bot.sendMessage(chatId, `Looks like those currency are not present on Binance`);
    }
  }

  public async selectNews(chatId: number) {
    if (!this.selection) {
      await this.bot.sendMessage(
        chatId,
        `Sorry, there is no selected currency, please try again`,
        TelegramBotActions.defaultReplyMarkup
      );
      return;
    }

    const newsByAsset = await this.requests.getNews(this.selection);

    if (!Object.keys(newsByAsset).length) {
      this.bot.sendMessage(
        chatId,
        `There is not important news 🤷‍♂️`,
        TelegramBotActions.defaultReplyMarkup
      );
      return;
    }

    try {
      const coinNewsMessage = this.cryptopanicNewsMapper.processDayTradingNews(newsByAsset);

      this.bot.sendMessage(chatId, coinNewsMessage, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
        ...TelegramBotActions.defaultReplyMarkup,
      });
    } catch (e) {
      await this.bot.sendMessage(
        chatId,
        `Can't retrieve news at the moment 🤷‍♂️`,
        TelegramBotActions.defaultReplyMarkup
      );
    }
  }

  public async renderIndicesCharts(chatId: number) {
    const capitalComClient = new CapitalComClient(EnvConfig.getInstance());
    const session = await capitalComClient.startSession();

    try {
      const marketDataSNP = await capitalComClient.getSNP(
        session,
        CapComTimeIntervals.HOUR,
        this.DEFAULT_CANDLE_NUMBER
      );

      const { data: dataSNP } = await TechIndicatorService.getInstance(
        this.envConfig
      ).getSMIndicator({
        chartData: marketDataSNP,
      });
      const imgSNP = this.chartSnapshot.generateImage(marketDataSNP, dataSNP || {});
      await this.bot.sendPhoto(chatId, imgSNP, { caption: `SNP 500 price chart` });

      const marketDataDXY = await capitalComClient.getDXY(
        session,
        CapComTimeIntervals.HOUR,
        this.DEFAULT_CANDLE_NUMBER
      );
      const { data: dataDXY } = await TechIndicatorService.getInstance(
        this.envConfig
      ).getSMIndicator({
        chartData: marketDataDXY,
      });
      const imgDXY = this.chartSnapshot.generateImage(marketDataDXY, dataDXY || {});
      await this.bot.sendPhoto(chatId, imgDXY, { caption: `DXY price chart` });
    } catch (e) {
      console.error(`error during chart indices chart generation`);
      console.log(e);
      await this.bot.sendMessage(chatId, `Somethings goes wrong with indices request`);
    }
  }

  public async acceptChartForSelectedCrypto(chatId: string): Promise<void> {
    await this.bot.sendMessage(chatId, `What crypto do you prefer? Please type space\\-separated text with asset name and time frame (5m, 15m, 1h, 4h)\, like \`\`\` btcusdt 5m\`\`\` or just type \`stop\` if you would like back to menu`,
    {
      parse_mode: 'MarkdownV2',
    });
  }

  public async fetchChartForSelectedCrypto(command: TelegramBot.Message): Promise<void> {
    if (!command.text) {
      throw new Error(`invalid command: "${command.text}"`);
    }
    try {
      await validateChartForSelectedCryptoCommand(command.text.trim(), this.envConfig);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
    const [asset, timeFrame] = command.text.split(' ');
    const binanceClient = await BinanceClient.getInstance(this.envConfig);
    const candles = await binanceClient.getCandles(
      asset.toUpperCase(),
      timeFrame as CandleChartInterval_LT,
      this.DEFAULT_CANDLE_NUMBER
    );
    const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
      chartData: candles,
    });
    console.log(data?.verticalLines);
    const img = this.chartSnapshot.generateImage(candles, data || {});
    await this.bot.sendPhoto(command.chat.id, img, {
      caption: `${asset} ${timeFrame} price chart`,
    });
  }

  public async acceptWatchedCryptoName(chatId: TelegramBot.ChatId): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `What crypto do you prefer? Please type space\\-separated text with asset name and time frame (5m, 15m, 1h, 4h)\, like \`\`\` btcusdt 5m\`\`\` or just type \`stop\` if you would like back to menu`,
      {
        parse_mode: 'MarkdownV2',
      }
    );
  }

  public async setupWatchedCrypto(command: TelegramBot.Message) {
    if (!command.text) {
      throw new Error(`invalid command: "${command.text}"`);
    }
    try {
      await validateChartForSelectedCryptoCommand(command.text?.trim(), this.envConfig);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
    const [asset, timeFrame] = command.text.trim().split(' ');

    try {
      await this.dynamoDBClient.addItemToWatchList(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as CandleChartInterval_LT,
      });

      this.assetWatchListProcessor.addNewWatchList(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as CandleChartInterval_LT,
      });
      this.bot.sendMessage(command.chat.id, `Everything is OK: ${asset} ${timeFrame} added to watch list`);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
  }

  public async getBTCChart(chatId: number) {
    const binanceClient = await BinanceClient.getInstance(this.envConfig);

    const candles = await binanceClient.getCandles('BTCUSDT', '1h', 700);
    const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
      chartData: candles,
    });
    const img = this.chartSnapshot.generateImage(candles, data || {});
    await this.bot.sendPhoto(chatId, img, { caption: `BTC price chart` });
  }
}

async function validateChartForSelectedCryptoCommand(
  text: string | undefined,
  envConfig: EnvConfig
): Promise<void> {
  if (!text) {
    throw new Error(`invalid command: "${text}"`);
  }
  const [asset, timeFrame] = text.split(' ');
  if (!asset || !asset.toUpperCase().includes('USDT')) {
    throw new Error(`invalid asset name: "${asset}"`);
  }
  if (!timeFrame || !ALLOWED_TIME_FRAMES.includes(timeFrame as CandleChartInterval_LT)) {
    throw new Error(`invalid time frame: "${timeFrame}"`);
  }

  BinanceClient.getInstance(envConfig);

  if (!(await BinanceClient.isSymbolExists(asset.toUpperCase()))) {
    throw new Error(`Binance does not support: "${asset}"`);
  }
}

const ALLOWED_TIME_FRAMES: CandleChartInterval_LT[] = ['1m', '5m', '15m', '1h', '4h'];
