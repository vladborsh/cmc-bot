import { EnvConfig } from '../env-config';
import axios, { AxiosResponse } from 'axios';
import { subDays, startOfDay } from 'date-fns';
import {
  CapComEncryptionKey,
  CapComMarketData,
  SessionKeys,
  WSCapComMarketData,
} from '../interfaces/capital-com.interfaces';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { CapComCandleType, CapComTimeIntervals, CapitalComPriceType, GeneralTimeIntervals } from '../enums';
import { chop } from '../formatting';
import { timeIntervalCapComToMillis } from './exchange-helpers';
import { IExchangeClient } from '../interfaces/exchange-client.interface';
import { Observable } from 'rxjs';
import { WebSocket } from 'ws';
import { mapGeneralTimeIntervalToCapCom } from './configs/capital-com-client.config';
import { CapitalComMarketMarketData } from './configs/capital-com-market-data.interface';

export class CapitalComClient implements IExchangeClient {
  private session: SessionKeys | undefined;
  constructor(private envConfig: EnvConfig) {}

  public async encryptKeys(): Promise<CapComEncryptionKey> {
    const encryptionKeyResponse: AxiosResponse<CapComEncryptionKey> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/session/encryptionKey`,
      {
        headers: {
          'X-CAP-API-KEY': this.envConfig.CAPITAL_COM_API_KEY,
        },
      }
    );

    return encryptionKeyResponse.data;
  }

  public async init(): Promise<void> {
    const session: AxiosResponse<SessionKeys> = await axios.post(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/session`,
      {
        identifier: this.envConfig.CAPITAL_COM_IDENTIFIER,
        password: this.envConfig.CAPITAL_COM_CUSTOM_PASS,
      },
      {
        headers: {
          'X-CAP-API-KEY': this.envConfig.CAPITAL_COM_API_KEY,
        },
      }
    );

    this.session = {
      CST: session.headers['cst'],
      X_SECURITY_TOKEN: session.headers['x-security-token'],
    };
  }

  public async getCandles(
    symbol: string,
    interval: GeneralTimeIntervals,
    limit: number
  ): Promise<CandleChartData[]> {
    if (!this.session) {
      throw new Error('Capital.com session was not started');
    }

    const [from, to] = CapitalComClient.getFromToDate(mapGeneralTimeIntervalToCapCom[interval], limit);

    const marketResponse: AxiosResponse<CapComMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/prices/${symbol}`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.session.X_SECURITY_TOKEN,
          CST: this.session.CST,
        },
        params: {
          resolution: interval,
          from,
          to,
          max: limit,
        },
      }
    );

    return CapitalComClient.mapMarketDataToChartData(marketResponse.data);
  }

  public getCandlesStream(
    asset: string,
    interval: GeneralTimeIntervals
  ): Observable<CandleChartData> {
    if (!this.session) {
      throw new Error('Capital.com session was not started');
    }
    const ws = new WebSocket(`${this.envConfig.CAPITAL_COM_WS_URL}`);

    ws.on('open', () => {
      if (!this.session) {
        throw new Error('Capital.com session was not started');
      }
      ws.send(
        JSON.stringify({
          destination: 'OHLCMarketData.subscribe',
          cst: this.session.CST,
          securityToken: this.session.X_SECURITY_TOKEN,
          payload: {
            epics: [asset],
            resolution: mapGeneralTimeIntervalToCapCom[interval],
            type: CapComCandleType.classic,
          },
        })
      );
    });
    return new Observable((observer) => {
      let bid: WSCapComMarketData | undefined;
      let ask: WSCapComMarketData | undefined;
      ws.on('message', (data) => {
        const wsEvent: WSCapComMarketData = JSON.parse(data.toString());
        if (wsEvent.destination === 'ohlc.event') {
          if (wsEvent.payload.priceType === CapitalComPriceType.ask) {
            ask = wsEvent;
          } else if (wsEvent.payload.priceType === CapitalComPriceType.bid) {
            bid = wsEvent;
          }
          if (!!bid && !!ask) {
            observer.next(CapitalComClient.mapWSMarketDataToChartData(bid, ask));
            bid = undefined;
            ask = undefined;
          }
        }
      });

      () => ws.send(
        JSON.stringify({
          destination: 'OHLCMarketData.unsubscribe',
          cst: this.session?.CST,
          securityToken: this.session?.X_SECURITY_TOKEN,
          payload: {
            epics: [asset],
            resolution: mapGeneralTimeIntervalToCapCom[interval],
            type: CapComCandleType.classic,
          },
        })
      );
    });
  }

  public async getMarketData(): Promise<CapitalComMarketMarketData> {
    if (!this.session) {
      throw new Error('Capital.com session was not started');
    }

    const response: AxiosResponse<CapitalComMarketMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/marketnavigation`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.session.X_SECURITY_TOKEN,
          CST: this.session.CST,
        },
      }
    );

    return response.data;
  }

  public async getMarketSearch(search: string): Promise<any> {
    if (!this.session) {
      throw new Error('Capital.com session was not started');
    }

    const response: AxiosResponse<any> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/markets?searchTerm=${search}`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.session.X_SECURITY_TOKEN,
          CST: this.session.CST,
        },
      }
    );

    return response.data;
  }

  static mapMarketDataToChartData(rawData: CapComMarketData): CandleChartData[] {
    return rawData.prices.map<CandleChartData>((candle) => ({
      openTime: Date.parse(candle.snapshotTime),
      open: (candle.openPrice.ask + candle.openPrice.bid) / 2,
      high: (candle.highPrice.ask + candle.highPrice.bid) / 2,
      low: (candle.lowPrice.ask + candle.lowPrice.bid) / 2,
      close: (candle.closePrice.ask + candle.closePrice.bid) / 2,
      volume: candle.lastTradedVolume,
    }));
  }

  static mapWSMarketDataToChartData(bid: WSCapComMarketData, ask: WSCapComMarketData): CandleChartData {
    return {
      openTime: bid.payload.t,
      open: (bid.payload.o + ask.payload.o) / 2,
      high: (bid.payload.h + ask.payload.h) / 2,
      low: (bid.payload.l + ask.payload.l) / 2,
      close: (bid.payload.c + ask.payload.c) / 2,
      volume: 0,
    };
  }

  static getFromToDate(interval: CapComTimeIntervals, limit: number): [string, string] {
    const timeBackShift = limit * timeIntervalCapComToMillis(interval);
    const fromDate = chop(new Date(Date.now() - timeBackShift).toISOString());
    const toDate = chop(new Date().toISOString());

    return [fromDate, toDate];
  }
}
