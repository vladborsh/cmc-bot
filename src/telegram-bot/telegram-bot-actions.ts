import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../env-config';
import { Requests } from '../requests';
import { MarketDataMapper } from '../market-data-mapper';
import { CryptopanicNewsMapper } from '../cryptopanic-news-mapper';
import { BotCommands, CapComTimeIntervals, GeneralTimeIntervals } from '../enums';
import { processDayTradingSelectionForMessage } from '../formatting';
import { BinanceClient } from '../exchange/binance-client';
import { ChartCanvasRenderer } from '../exchange/chart-canvas-renderer';
import { CapitalComClient } from '../exchange/capital-com-client';
import { ReplyMarkup } from '../interfaces/reply-markup';
import { DynamoDBClient } from '../db/dynamo-db-client';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import { AssetWatchListProcessor } from '../exchange/asset-watch-list-processor';
import { getLinkText } from '../ge-link-text.helper';
import { DynamicConfig } from '../dynamic-config';
import { WatchListItemExchange } from '../interfaces/user-state.interface';

export class TelegramBotActions {
  requests: Requests;
  selection: string[] | undefined;

  static defaultReplyMarkup: ReplyMarkup = {
    reply_markup: {
      keyboard: [
        [{ text: BotCommands.topCrypto }, { text: BotCommands.indices }],
        [{ text: BotCommands.getAssetChart }, { text: BotCommands.watchlist }],
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
    private dynamicConfig: DynamicConfig,
    selection?: string[]
  ) {
    this.bot = bot;
    this.requests = new Requests(envConfig);
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
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const marketDataMapper = new MarketDataMapper(dynamicConfigValues);
    const marketData = await this.requests.selectDayTradingFromMarket();
    const selection = marketDataMapper.filterAndSortCoins(marketData, command.text as BotCommands);
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
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);

    for (let symbol of this.selection.map((symbol) => `${symbol}USDT`)) {
      try {
        if (!(await binanceClient.isSymbolExists(symbol))) {
          continue;
        }
      } catch (e) {
        console.error(e);
        break;
      }

      try {
        const candles = await binanceClient.getCandles(
          symbol,
          GeneralTimeIntervals.h1,
          dynamicConfigValues.CHART_HISTORY_SIZE
        );
        const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
          chartData: candles,
        });
        const img = chartCanvasRenderer.generateImage(candles, data || {});
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

    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const cryptopanicNewsMapper = new CryptopanicNewsMapper(dynamicConfigValues);

    try {
      const coinNewsMessage = cryptopanicNewsMapper.processDayTradingNews(newsByAsset);

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
    const capitalComClient = CapitalComClient.getInstance(EnvConfig.getInstance());
    const dynamicConfigValues = await this.dynamicConfig.getConfig();

    try {
      for (let asset of ['US500', 'DXY']) {
        const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);
        const marketData = await capitalComClient.getCandles(
          asset,
          GeneralTimeIntervals.h1,
          dynamicConfigValues.CHART_HISTORY_SIZE
        );

        const { data } = await TechIndicatorService.getInstance(
          this.envConfig
        ).getSMIndicator({
          chartData: marketData,
        });
        const img = chartCanvasRenderer.generateImage(marketData, data || {});
        await this.bot.sendPhoto(chatId, img, { caption: `${asset} price chart` });
      }
    } catch (e) {
      console.error(`error during chart indices chart generation`, e);
      await this.bot.sendMessage(chatId, `Somethings goes wrong with indices request`);
    }
  }

  public async acceptChartForSelectedCrypto(chatId: string): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `What crypto do you prefer? Please type space\\-separated text with asset name and timeframe \\(m5, m15, h1, h4\\), like \`\`\` btcusdt m5\`\`\` or just type \`stop\` if you would like back to menu`,
      {
        parse_mode: 'MarkdownV2',
      }
    );
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

    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);
    const [asset, timeFrame] = command.text.split(' ');
    const binanceClient = await BinanceClient.getInstance(this.envConfig);
    const candles = await binanceClient.getCandles(
      asset.toUpperCase(),
      timeFrame as GeneralTimeIntervals,
      dynamicConfigValues.CHART_HISTORY_SIZE
    );
    const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
      chartData: candles,
    });
    const img = chartCanvasRenderer.generateImage(candles, data || {});
    await this.bot.sendPhoto(command.chat.id, img, {
      caption: getLinkText(asset, timeFrame),
      parse_mode: 'MarkdownV2',
    });
  }

  public async acceptAssetNameToAddInWatchList(chatId: TelegramBot.ChatId): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `What asset do you want to add in watch list? Please type space\\-separated text with asset name, timeframe \\(m5, m15, h1, h4\\) and optionally exchange, like \`btcusdt m5\` or \`gbpusd m15 capitalcom\` or just type \`stop\` if you would like back to menu`,
      {
        parse_mode: 'MarkdownV2',
      }
    );
  }

  public async addAssetToWatchList(command: TelegramBot.Message) {
    if (!command.text) {
      throw new Error(`invalid command: "${command.text}"`);
    }
    try {
      await validateChartForSelectedCryptoCommand(command.text?.trim(), this.envConfig);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
    const [asset, timeFrame, exchange] = command.text.trim().split(' ');

    try {
      await this.dynamoDBClient.addItemToWatchList(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: exchange as WatchListItemExchange ?? WatchListItemExchange.binance,
      });

      this.assetWatchListProcessor.addWatchListItem(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: exchange as WatchListItemExchange ?? WatchListItemExchange.binance,
      });

      const watchListMessage = await this.getWatchListMessage(command.chat.id);

      this.bot.sendMessage(
        command.chat.id,
        `Everything is OK: ${asset} ${timeFrame} added to watch list \n\n${watchListMessage}`
      );
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
  }

  public async getBTCChart(chatId: TelegramBot.ChatId) {
    const binanceClient = await BinanceClient.getInstance(this.envConfig);
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);
    const candles = await binanceClient.getCandles('BTCUSDT', GeneralTimeIntervals.h1, 700);
    const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
      chartData: candles,
    });
    const img = chartCanvasRenderer.generateImage(candles, data || {});
    await this.bot.sendPhoto(chatId, img, { caption: `BTC price chart` });
  }

  public async getWatchListMenu(chatId: TelegramBot.ChatId): Promise<void> {
    await this.bot.sendMessage(chatId, `What we gonna do with watch list?`, {
      reply_markup: {
        keyboard: [
          [{ text: BotCommands.addToWatchlist }, { text: BotCommands.removeFromWatchlist }],
          [{ text: BotCommands.viewWatchlist }, { text: BotCommands.back }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  public async viewWatchList(chatId: TelegramBot.ChatId): Promise<void> {
    const finalMessage = await this.getWatchListMessage(chatId);

    await this.bot.sendMessage(chatId, finalMessage);
  }

  public async acceptAssetNameToRemoveFromWatchList(chatId: TelegramBot.ChatId): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `What asset do you want to remove from list? Please type space\\-separated text with asset name, timeframe \\(m5, m15, h1, h4\\) and optionally exchange, like \`btcusdt m5\` or \`gbpusd m15 capitalcom\` or just type \`stop\` if you would like back to menu`,
      {
        parse_mode: 'MarkdownV2',
      }
    );
  }

  public async removeAssetFromWatchList(command: TelegramBot.Message) {
    if (!command.text) {
      throw new Error(`invalid command: "${command.text}"`);
    }
    try {
      await validateChartForSelectedCryptoCommand(command.text?.trim(), this.envConfig);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
    const [asset, timeFrame, exchange] = command.text.trim().split(' ');

    try {
      await this.dynamoDBClient.removeItemFromWatchList(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: exchange as WatchListItemExchange ?? WatchListItemExchange.binance,
      });

      this.assetWatchListProcessor.removeWatchListItem(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: exchange as WatchListItemExchange ?? WatchListItemExchange.binance,
      });

      const watchListMessage = await this.getWatchListMessage(command.chat.id);

      this.bot.sendMessage(
        command.chat.id,
        `Everything is OK: ${asset} ${timeFrame} removed from watch list \n\n${watchListMessage}`
      );
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
  }

  private async getWatchListMessage(chatId: TelegramBot.ChatId): Promise<string> {
    const userState = await this.dynamoDBClient.getUserState(chatId);

    const messageStr = userState?.watchList?.reduce(
      (message, item) => `${message}- ${item.name} ${item.timeFrame}\n`,
      ''
    );

    return messageStr ? `Watch list:\n${messageStr}` : `You don't have watched crypto`;
  }
}

async function validateChartForSelectedCryptoCommand(
  text: string | undefined,
  envConfig: EnvConfig
): Promise<void> {
  if (!text) {
    throw new Error(`invalid command: "${text}"`);
  }
  const [asset, timeFrame, exchange] = text.split(' ');
  if (!exchange || exchange === 'binance') {
    if (!asset || !asset.toUpperCase().includes('USDT')) {
      throw new Error(`invalid asset name: "${asset}"`);
    }
    const binanceClient = BinanceClient.getInstance(envConfig);
    if (!(await binanceClient.isSymbolExists(asset.toUpperCase()))) {
      throw new Error(`Binance does not support: "${asset}"`);
    }
  }
  if (!timeFrame || !ALLOWED_TIME_FRAMES.includes(timeFrame as GeneralTimeIntervals)) {
    throw new Error(`invalid time frame: "${timeFrame}"`);
  }
}

const ALLOWED_TIME_FRAMES: GeneralTimeIntervals[] = [
  GeneralTimeIntervals.m1,
  GeneralTimeIntervals.m5,
  GeneralTimeIntervals.m15,
  GeneralTimeIntervals.h1,
  GeneralTimeIntervals.h4,
];
