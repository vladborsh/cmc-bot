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
import { UserState, WatchListItem } from '../db/interfaces/user-state.interface';
import { BinanceClient } from './binance-client';
import { ChartSnapshot } from './chart-snaphot';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import TelegramBot from 'node-telegram-bot-api';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { SmIndicatorData } from '../indicators/interfaces/sm-indicator-response';

export class AssetWatchListProcessor {
  private static instance: AssetWatchListProcessor;
  private dynamicChatIdToWatchListMap$ = new BehaviorSubject<Record<string, WatchListItem[]>>({});
  private onTerminate$ = new Subject<void>();
  private chatIdToHistoryCandles: Record<string, Record<string, CandleChartData[]>> = {};
  private readonly HISTORY_SIZE = 700;

  private constructor(
    private dynamoDBClient: DynamoDBClient,
    private techIndicatorService: TechIndicatorService,
    private binanceClient: BinanceClient,
    private bot: TelegramBot
  ) {}

  public static getInstance(
    dynamoDBClient: DynamoDBClient,
    techIndicatorService: TechIndicatorService,
    binanceClient: BinanceClient,
    bot: TelegramBot
  ): AssetWatchListProcessor {
    if (!this.instance) {
      this.instance = new AssetWatchListProcessor(dynamoDBClient, techIndicatorService, binanceClient, bot);
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

  public addNewWatchList(chatId: TelegramBot.ChatId, watchListItem: WatchListItem) {
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
      watchList.map((watchListItem) =>
        this.binanceClient
          .getCandlesStream(watchListItem.name, watchListItem.timeFrame)
          .pipe(
            tap((lastChartData) => this.processLastChartData(lastChartData, chatId, watchListItem))
          )
      )
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
    let data: SmIndicatorData | undefined;
    try {
      const response = await this.techIndicatorService.getSMIndicator({
        chartData: historyCandles,
      });
      data = response.data;
    } catch (e) {
      return;
    }

    const chartSnapshot = new ChartSnapshot();
    if (data?.alerts?.length) {
      const img = chartSnapshot.generateImage(
        historyCandles,
        data?.plotShapes,
        data?.plots,
        data?.lines,
        data?.verticalLines,
        data?.horizontalLines
      );

      await this.bot.sendPhoto(chatId, img, {
        caption: `${watchListItem.name} ${watchListItem.timeFrame} price chart. ${data?.alerts.join(
          ' '
        )}`,
      });
    }
  }

  private async getCachedHistoryCandles(chatId: string, watchListItem: WatchListItem) {
    if (!this.chatIdToHistoryCandles[chatId]) {
      this.chatIdToHistoryCandles[chatId] = {};
    }
    if (!this.chatIdToHistoryCandles[chatId][getWatchListKey(watchListItem)]) {
      const binanceCandles = await this.binanceClient.getCandles(
        watchListItem.name,
        watchListItem.timeFrame,
        this.HISTORY_SIZE
      );
      /* last candles is unfinished */
      binanceCandles.pop();
      binanceCandles.pop();
      this.chatIdToHistoryCandles[chatId][getWatchListKey(watchListItem)] = binanceCandles;
    }

    return this.chatIdToHistoryCandles[chatId][getWatchListKey(watchListItem)];
  }
}

function getWatchListKey(watchListItem: WatchListItem): string {
  return `${watchListItem.name}:${watchListItem.timeFrame}`;
}
