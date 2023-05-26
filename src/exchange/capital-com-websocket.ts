import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Observer,
  Subject,
  catchError,
  filter,
  switchMap,
  withLatestFrom,
} from 'rxjs';
import {
  CapComCandleType,
  CapComTimeIntervals,
  CapitalComPriceType,
  GeneralTimeIntervals,
} from '../enums';
import { EnvConfig } from '../env-config';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { SessionKeys, WSCapComMarketData } from '../interfaces/capital-com.interfaces';
import { mapWSMarketDataToChartData } from './configs/capital-com.helpers';
import {
  capitalComIntervalToMinutes,
  mapGeneralTimeIntervalToCapCom,
} from './configs/capital-com-client.config';
import { WebSocket } from 'ws';
import { BidAsk, EpicDataWSEvent, EpicObject } from './cap-com.interfaces';

export class CapitalComWebsocket {
  private ws: WebSocket | undefined;
  private epicObjs$ = new BehaviorSubject<EpicObject[]>([]);
  private epicTimeToLastPrice: Record<string, CandleChartData> = {};
  private epicToBidAsk: Record<string, BidAsk> = {};
  private emitters: Record<string, Subject<CandleChartData>> = {};

  constructor(
    private envConfig: EnvConfig,
    private session$: BehaviorSubject<SessionKeys>,
    private checkAndRenewSession: Function
  ) {}

  public init(): void {
    this.runSessionRenewalInterval();

    this.onOpen$()
      .pipe(
        switchMap(() => this.epicObjs$),
        filter((epicObjs) => !!epicObjs && !!epicObjs.length),
        withLatestFrom(this.session$),
        switchMap(([epicObjs, session]) =>
          this.sendSubscribeMsg(
            epicObjs.map(({ epic }) => epic),
            session
          ),
        ),
      )
      .subscribe();

    this.onMessage$().subscribe((epicEvent) => {
      const epicObjs = this.epicObjs$.getValue();

      for (let epicObj of epicObjs) {
        const key = this.getKey(epicObj.epic, epicObj.interval);

        const now = new Date();

        try {

          if (
            epicObj.epic === epicEvent.epic &&
            now.getMinutes() % capitalComIntervalToMinutes[epicObj.interval] === 0 &&
            !!this.emitters[key]
          ) {
            if (epicObj.interval === CapComTimeIntervals.MINUTE) {
              this.emitters[key].next(epicEvent.data);
            } else {
              if (this.epicTimeToLastPrice[key]) {
                this.setEpicTimeToLastPrice(epicObj.epic, epicObj.interval, epicEvent.data);
                this.emitters[key].next(this.epicTimeToLastPrice[key]);
              }
            }
          }
          if (
            epicObj.epic === epicEvent.epic &&
            now.getMinutes() % capitalComIntervalToMinutes[epicObj.interval] === 1
          ) {
            this.resetEpicTimeToLastPrice(epicObj.epic, epicObj.interval, epicEvent.data);
          } else if (
            epicObj.epic === epicEvent.epic &&
            now.getMinutes() % capitalComIntervalToMinutes[epicObj.interval] !== 0
          ) {
            this.setEpicTimeToLastPrice(epicObj.epic, epicObj.interval, epicEvent.data);
          }
        } catch(e) {
          console.error(e);
          this.emitters[key].error(e);
        }
      }

    });
  }

  public getCandlesStream(
    asset: string,
    interval: GeneralTimeIntervals
  ): Observable<CandleChartData> {
    const timeframe = mapGeneralTimeIntervalToCapCom[interval];
    const epicObjs = this.epicObjs$.getValue();
    const foundEpic = epicObjs.find((epicO) => epicO.epic === asset && epicO.interval === timeframe);

    if (!foundEpic) {
      this.epicObjs$.next([...this.epicObjs$.getValue(), { epic: asset, interval: timeframe }]);
    }

    if (!this.emitters[this.getKey(asset, timeframe)]) {
      this.emitters[this.getKey(asset, timeframe)] = new Subject<CandleChartData>();
    }

    return this.emitters[this.getKey(asset, timeframe)];
  }

  private onOpen$(): Observable<void> {
    return new Observable((observer: Observer<void>) => {
      this.ws = new WebSocket(`${this.envConfig.CAPITAL_COM_WS_URL}`);

      this.ws.on('open', () => observer.next());
    });
  }

  private onMessage$(): Observable<EpicDataWSEvent> {
    return new Observable((observer) => {
      this.ws?.on('message', (data) => {
        const wsEvent: WSCapComMarketData = JSON.parse(data.toString());

        if (wsEvent.destination === 'ohlc.event') {
          const epic = wsEvent.payload.epic;
          if (!this.epicToBidAsk[epic]) {
            this.epicToBidAsk[epic] = {
              bid: undefined,
              ask: undefined,
            };
          }

          if (wsEvent.payload.priceType === CapitalComPriceType.ask) {
            this.epicToBidAsk[epic].ask = wsEvent;
          } else if (wsEvent.payload.priceType === CapitalComPriceType.bid) {
            this.epicToBidAsk[epic].bid = wsEvent;
          }

          if (this.epicToBidAsk[epic].bid && this.epicToBidAsk[epic].ask) {
            observer.next({
              epic,
              data: mapWSMarketDataToChartData(
                this.epicToBidAsk[epic].bid as WSCapComMarketData,
                this.epicToBidAsk[epic].ask as WSCapComMarketData
              ),
            });
            this.epicToBidAsk[epic] = {
              bid: undefined,
              ask: undefined,
            };
          }
        }
      });
    });
  }

  private sendSubscribeMsg(epics: string[], session: SessionKeys): Observable<void> {
    return new Observable((observer) => {
      this.ws?.send(
        JSON.stringify({
          destination: 'OHLCMarketData.subscribe',
          cst: session.CST,
          securityToken: session.X_SECURITY_TOKEN,
          payload: {
            epics,
            resolution: CapComTimeIntervals.MINUTE,
            type: CapComCandleType.classic,
          },
        })
      );
      observer.next();
    });
  }

  private runSessionRenewalInterval(): void {
    setInterval(async () => {
      await this.checkAndRenewSession();

      this.ws?.send(
        JSON.stringify({
          destination: 'ping',
          cst: this.session$.getValue().CST,
          securityToken: this.session$.getValue().X_SECURITY_TOKEN,
        })
      );
    }, 60 * 1000);
  }

  private setEpicTimeToLastPrice(
    asset: string,
    interval: CapComTimeIntervals,
    candle: CandleChartData
  ): void {
    if (!this.epicTimeToLastPrice[this.getKey(asset, interval)]) {
      return;
    } else {
      const oldCandle = this.epicTimeToLastPrice[this.getKey(asset, interval)];
      oldCandle.close = candle.close;
      oldCandle.low = oldCandle.low > candle.low ? candle.low : oldCandle.low;
      oldCandle.high = oldCandle.high < candle.high ? candle.high : oldCandle.high;
    }
  }

  private resetEpicTimeToLastPrice(
    asset: string,
    interval: CapComTimeIntervals,
    candle: CandleChartData
  ): void {
    this.epicTimeToLastPrice[this.getKey(asset, interval)] = candle;
  }

  private getKey(asset: string, timeframe: CapComTimeIntervals): string {
    return `${asset}:${timeframe}`;
  }
}
