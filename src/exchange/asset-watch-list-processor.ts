import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { DynamoDBClient } from '../db/dynamo-db-client';
import { UserState, WatchListItem, Exchange } from '../interfaces/user-state.interface';
import { BinanceClient } from './binance-client';
import { ChartCanvasRenderer } from './chart-canvas-renderer';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import TelegramBot from 'node-telegram-bot-api';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { getLinkText } from '../ge-link-text.helper';
import { DynamicConfig } from '../dynamic-config';
import { ChartDrawingsData } from '../interfaces/indicator/sm-indicator-response';
import { CapitalComClient } from './capital-com-client';
import { IExchangeClient } from '../interfaces/exchange-client.interface';

export class AssetWatchListProcessor {
  private static instance: AssetWatchListProcessor;
  private dynamicChatIdToWatchListMap$ = new BehaviorSubject<Record<string, WatchListItem[]>>({});
  private onTerminate$ = new Subject<void>();
  private chatIdToHistoryCandles: Record<string, Record<string, CandleChartData[]>> = {};

  watchListItemToExchange: Record<Exchange, IExchangeClient> = {
    [Exchange.binance]: this.binanceClient,
    [Exchange.capitalcom]: this.capitalComClient,
  }

  private constructor(
    private dynamoDBClient: DynamoDBClient,
    private techIndicatorService: TechIndicatorService,
    private binanceClient: BinanceClient,
    private capitalComClient: CapitalComClient,
    private dynamicConfig: DynamicConfig,
    private bot: TelegramBot
  ) {}

  public static getInstance(
    dynamoDBClient: DynamoDBClient,
    techIndicatorService: TechIndicatorService,
    binanceClient: BinanceClient,
    capitalComClient: CapitalComClient,
    dynamicConfig: DynamicConfig,
    bot: TelegramBot
  ): AssetWatchListProcessor {
    if (!this.instance) {
      this.instance = new AssetWatchListProcessor(
        dynamoDBClient,
        techIndicatorService,
        binanceClient,
        capitalComClient,
        dynamicConfig,
        bot
      );
    }

    return this.instance;
  }

  public async init(): Promise<void> {
    this.runSubscription();
    const userStateList: UserState[] = await this.dynamoDBClient.getAllItems();

    this.dynamicChatIdToWatchListMap$.next(
      userStateList.reduce(
        (acc, userSate) => ({
          ...acc,
          [userSate.chatId]: userSate.watchList || [],
        }),
        {} as Record<string, WatchListItem[]>
      )
    );
  }

  public terminate(): void {
    this.onTerminate$.next();
  }

  public addWatchListItem(chatId: TelegramBot.ChatId, watchListItem: WatchListItem) {
    const chatIdToWatchListMap = this.dynamicChatIdToWatchListMap$.getValue();
    if (chatIdToWatchListMap[chatId]) {
      const foundWLItem = chatIdToWatchListMap[chatId].find(
        (wl) => wl.name === watchListItem.name && wl.timeFrame === watchListItem.timeFrame
      );
      if (foundWLItem) {
        throw new Error(
          `this item already watched: ${watchListItem.name} ${watchListItem.timeFrame}`
        );
      }

      this.dynamicChatIdToWatchListMap$.next({
        ...chatIdToWatchListMap,
        [chatId]: [...chatIdToWatchListMap[chatId], watchListItem],
      });
    } else {
      this.dynamicChatIdToWatchListMap$.next({
        ...chatIdToWatchListMap,
        [chatId]: [watchListItem],
      });
    }
  }

  public removeWatchListItem(chatId: TelegramBot.ChatId, watchListItem: WatchListItem) {
    const chatIdToWatchListMap = this.dynamicChatIdToWatchListMap$.getValue();
    if (chatIdToWatchListMap[chatId]) {
      this.dynamicChatIdToWatchListMap$.next({
        ...chatIdToWatchListMap,
        [chatId]: chatIdToWatchListMap[chatId].filter(
          (item) => !(item.name === watchListItem.name && item.timeFrame === watchListItem.timeFrame)
        ),
      });
    } else {
      this.dynamicChatIdToWatchListMap$.next({
        ...chatIdToWatchListMap,
        [chatId]: [watchListItem],
      });
    }
  }

  private runSubscription(): void {
    this.dynamicChatIdToWatchListMap$
      .pipe(
        tap((chatIdToWatchListMap) => {
          console.info(chatIdToWatchListMap);
        }),
        switchMap((chatIdToWatchListMap) =>
          combineLatest(
            Object.entries(chatIdToWatchListMap).map(([chatId, watchList]) =>
              this.getSubscriptionForWatchList(chatId, watchList)
            )
          )
        ),
        takeUntil(this.onTerminate$)
      )
      .subscribe();
  }

  private getSubscriptionForWatchList(
    chatId: string,
    watchList: WatchListItem[]
  ): Observable<CandleChartData[]> {
    return combineLatest(
      watchList.map((watchListItem) =>{
        const client = watchListItem.exchange ? this.watchListItemToExchange[watchListItem.exchange] : this.binanceClient;

        return client
          .getCandlesStream(watchListItem.name, watchListItem.timeFrame)
          .pipe(
            tap((lastChartData) => this.processLastChartData(lastChartData, chatId, watchListItem))
          )
      })
    );
  }

  private async processLastChartData(
    lastChartData: CandleChartData,
    chatId: string,
    watchListItem: WatchListItem
  ): Promise<void> {
    const historyCandles = await this.getCachedHistoryCandles(chatId, watchListItem);
    historyCandles.push(lastChartData);
    historyCandles.shift();
    let data: ChartDrawingsData | undefined;
    try {
      const response = await this.techIndicatorService.getSMIndicator({
        chartData: historyCandles,
      });
      data = response.data;
    } catch (e) {
      console.error(e)
      return;
    }
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);

    if (data?.alerts?.length) {
      const img = chartCanvasRenderer.generateImage(historyCandles, data);

      await this.bot.sendPhoto(chatId, img, {
        caption: `${getLinkText(watchListItem.name, watchListItem.timeFrame)} ${data?.alerts.join(' ')}`,
        parse_mode: 'MarkdownV2',
      });
    }
  }

  private async getCachedHistoryCandles(chatId: string, watchListItem: WatchListItem) {
    if (!this.chatIdToHistoryCandles[chatId]) {
      this.chatIdToHistoryCandles[chatId] = {};
    }
    if (!this.chatIdToHistoryCandles[chatId][getWatchListKey(watchListItem)]) {
      const dynamicConfigValues = await this.dynamicConfig.getConfig();
      const exchangeClient = watchListItem.exchange ? this.watchListItemToExchange[watchListItem.exchange] : this.binanceClient;
      const historyCandles = await exchangeClient.getCandles(
        watchListItem.name,
        watchListItem.timeFrame,
        dynamicConfigValues.CHART_HISTORY_SIZE,
      );
      /* last candles is unfinished */
      historyCandles.pop();
      if (watchListItem.exchange === Exchange.binance) {
        historyCandles.pop();
      }
      this.chatIdToHistoryCandles[chatId][getWatchListKey(watchListItem)] = historyCandles;
    }

    return this.chatIdToHistoryCandles[chatId][getWatchListKey(watchListItem)];
  }
}

function getWatchListKey(watchListItem: WatchListItem): string {
  return `${watchListItem.name}:${watchListItem.timeFrame}`;
}
