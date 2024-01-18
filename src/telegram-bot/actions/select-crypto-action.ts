import TelegramBot from 'node-telegram-bot-api';
import { DynamicConfig } from '../../dynamic-config';
import { EnvConfig } from '../../env-config';
import { Requests } from '../../requests';
import { DynamoDBClient } from '../../db/dynamo-db-client';
import { MarketDataMapper } from '../../market-data-mapper';
import { getMessageForSelection, processDayTradingSelectionForMessage } from '../../formatting';
import { BotCommands, GeneralTimeIntervals, LogMessageType } from '../../enums';
import { ChartCanvasRenderer } from '../../exchange/chart-canvas-renderer';
import { BinanceClient } from '../../exchange/binance-client';
import { BotLogger } from '../../utils/bot-logger';
import { TechIndicatorService } from '../../indicators/tech-indicator-service';
import { MappedListing } from '../../interfaces/mapped-listing.interface';
import { PhotoSender } from '../../utils/photo-sender';

export class SelectCryptoAction {
  binanceClient = BinanceClient.getInstance(this.envConfig, this.dynamicConfig);
  techIndicatorService = TechIndicatorService.getInstance(this.envConfig);

  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private bot: TelegramBot,
    private dynamoDbClient: DynamoDBClient,
    private requests: Requests
  ) {}

  public async execute(command: TelegramBot.Message) {
    await this.bot.sendMessage(command.chat.id, `Processing...`);
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const marketDataMapper = new MarketDataMapper(dynamicConfigValues);
    const marketData = await this.requests.selectDayTradingFromMarket();
    const selection = marketDataMapper.filterAndSortCoins(marketData, command.text as BotCommands);
    const newSelection = selection.map((listing) => listing.symbol);

    await this.dynamoDbClient.updateLastSelectedCrypto(command.chat.id, newSelection);

    await this.renderCharts(command.chat.id, selection);
  }

  private async renderCharts(chatId: TelegramBot.ChatId, selection: MappedListing[]) {
    const photoSender = PhotoSender.getInstance(this.envConfig);

    let i = 0;
    for (let selectItem of selection) {
      const symbol = selectItem.symbol;
      if (!(await this.binanceClient.isSymbolExists(`${symbol}USDT`))
        || !(await this.binanceClient.isSymbolExists(`${symbol}BTC`))
      ) {
        continue;
      }

      try {
        const actualChart = await this.getPhoto(`${symbol}USDT`);
        const actualChartHTF = await this.getPhoto(`${symbol}USDT`, GeneralTimeIntervals.d1);
        const btcRelationChart = await this.getPhoto(`${symbol}BTC`);
        const photos = await photoSender.getMediaURLs([actualChart, actualChartHTF, btcRelationChart]);
        photos[0].caption = getMessageForSelection(selectItem);
        photos[0].parse_mode = 'MarkdownV2';

        await this.bot.sendMediaGroup(chatId, photos)
      } catch (e) {
        await this.bot.sendMessage(chatId, `Something goes wrong. ${e}`);
      }
      i++;
    }
  }

  private async getPhoto(symbol: string, interval = GeneralTimeIntervals.h1): Promise<Buffer> {
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);

    const candles = await this.binanceClient.getCandles(
      symbol,
      interval,
      dynamicConfigValues.CHART_HISTORY_SIZE
    );
    const { data } = await this.techIndicatorService.getSMIndicator({
      chartData: candles,
    });

    data.plotShapes = [];

    return chartCanvasRenderer.generateImage(candles, data || {}, `${symbol} ${interval}`);
  }
}
