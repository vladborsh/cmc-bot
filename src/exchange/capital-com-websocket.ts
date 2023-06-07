import {
  BehaviorSubject,
  Observable,
  Observer,
  Subject,
  combineLatest,
  filter,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import axios, { AxiosResponse } from 'axios';
import {
  CapComCandleType,
  CapComTimeIntervals,
  CapitalComPriceType,
  GeneralTimeIntervals,
  LogErrorType,
  LogMessageType,
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
import { Logger } from 'winston';
import { CapitalComSession } from './capital-com-session';

export class CapitalComWebsocket {
  private ws: WebSocket | undefined;
  private epicObjs$ = new BehaviorSubject<EpicObject[]>([]);
  private epicTimeToLastPrice: Record<string, CandleChartData> = {};
  private epicToBidAsk: Record<string, BidAsk> = {};
  private emitters: Record<string, Subject<CandleChartData>> = {};
  static instance: CapitalComWebsocket;

  private constructor(
    private envConfig: EnvConfig,
    private capitalComSession: CapitalComSession,
    private logger: Logger
  ) {}

  public static getInstance(
    envConfig: EnvConfig,
    capitalComSession: CapitalComSession,
    logger: Logger
  ): CapitalComWebsocket {
    if (!this.instance) {
      this.instance = new CapitalComWebsocket(envConfig, capitalComSession, logger);
    }

    return this.instance;
  }

  public init(): void {
    this.runSessionRenewalInterval();

    this.onOpen$()
      .pipe(
        switchMap(() => this.epicObjs$),
        filter((epicObjs) => !!epicObjs && !!epicObjs.length),
        withLatestFrom(this.capitalComSession.session$)
      )
      .subscribe(([epicObjs, session]) => {
        this.sendSubscribeMsg(
          epicObjs.map(({ epic }) => epic),
          session
        );
      });

    this.onError$().subscribe((err) => {
      this.logger.error({ type: LogErrorType.WS_ERROR, message: err?.message });
    });

    this.onMessage$().subscribe((epicEvent) => {
      const epicObjs = this.epicObjs$.getValue();

      this.logger.info({ type: LogMessageType.WS_EPIC_EVENT, message: `${epicEvent.epic}` });

      try {
        for (let epicObj of epicObjs) {
          const key = this.getKey(epicObj.epic, epicObj.interval);

          if (epicObj.epic !== epicEvent.epic || !this.emitters[key]) {
            continue;
          }

          const now = new Date();

          if (now.getMinutes() % capitalComIntervalToMinutes[epicObj.interval] === 0) {
            if (epicObj.interval === CapComTimeIntervals.MINUTE) {
              this.emitters[key].next(epicEvent.data);
            } else {
              if (this.epicTimeToLastPrice[key]) {
                this.setEpicTimeToLastPrice(epicObj.epic, epicObj.interval, epicEvent.data);
                this.emitters[key].next(this.epicTimeToLastPrice[key]);
              }
            }
          }
          if (now.getMinutes() % capitalComIntervalToMinutes[epicObj.interval] === 1) {
            this.epicTimeToLastPrice[this.getKey(epicObj.epic, epicObj.interval)] = epicEvent.data;
          } else if (now.getMinutes() % capitalComIntervalToMinutes[epicObj.interval] !== 0) {
            this.setEpicTimeToLastPrice(epicObj.epic, epicObj.interval, epicEvent.data);
          }
        }
      } catch (e) {
        this.logger.error({ type: LogErrorType.WS_ON_MESSAGE_ERROR, message: e });
      }
    });
  }

  public getCandlesStream(
    asset: string,
    interval: GeneralTimeIntervals
  ): Observable<CandleChartData> {
    const timeframe = mapGeneralTimeIntervalToCapCom[interval];
    const epicObjs = this.epicObjs$.getValue();
    const foundEpic = epicObjs.find(
      (epicO) => epicO.epic === asset && epicO.interval === timeframe
    );

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

  private onError$(): Observable<Error> {
    return new Observable((observer) => {
      this.ws?.on('error', (data) => {
        observer.next(data);
      });
    });
  }

  private onMessage$(): Observable<EpicDataWSEvent> {
    return new Observable((observer) => {
      this.ws?.on('message', (data) => {
        let wsEvent: WSCapComMarketData;

        try {
          wsEvent = JSON.parse(data.toString());
        } catch (e) {
          this.logger.error({ type: LogErrorType.WS_PARSE_ERROR, message: e });
          return;
        }

        if (wsEvent.destination === 'OHLCMarketData.subscribe') {
          this.logger.info({
            type: LogMessageType.WS_NEW_MESSAGE,
            message: `${wsEvent.destination}`,
          });
        }

        try {
          if (wsEvent.destination === 'ohlc.event') {
            this.logger.info({
              type: LogMessageType.WS_NEW_MESSAGE,
              message: `${wsEvent.destination}, ${wsEvent?.payload?.priceType}, ${wsEvent?.payload?.epic}`,
            });

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
        } catch (e) {
          this.logger.error({ type: LogErrorType.WS_BID_ASK_ERROR, message: e });
        }
      });
    });
  }

  private ping(): void {
    this.ws?.send(
      JSON.stringify({
        destination: 'ping',
        cst: this.capitalComSession.session$.getValue().CST,
        securityToken: this.capitalComSession.session$.getValue().X_SECURITY_TOKEN,
      })
    );
  }

  private sendSubscribeMsg(epics: string[], session: SessionKeys): void {
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
  }

  private runSessionRenewalInterval(): void {
    setInterval(async () => {
      try {
        await this.capitalComSession.renewSession();
        this.ping();
        this.logger.info({ type: LogMessageType.WS_SESSION_RENEW });
      } catch (e) {
        this.logger.error({ type: LogErrorType.WS_SESSION_ERROR, message: e });
      }
    }, 9 * 60 * 1000);
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

  private getKey(asset: string, timeframe: CapComTimeIntervals): string {
    return `${asset}:${timeframe}`;
  }
}
