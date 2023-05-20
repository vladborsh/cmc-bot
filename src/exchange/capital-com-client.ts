import { EnvConfig } from '../env-config';
import axios, { AxiosResponse } from 'axios';
import { subDays, startOfDay } from 'date-fns';
import {
  CapComEncryptionKey,
  CapComMarketData,
  SessionKeys,
} from '../interfaces/capital-com.interfaces';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { CapComTimeIntervals } from '../enums';
import { chop } from '../formatting';
import { timeIntervalCapComToMillis } from './exchange-helpers';

export class CapitalComClient {
  private session: SessionKeys | undefined;
  constructor(private envConfig: EnvConfig) {}

  public async encryptKeys(): Promise<CapComEncryptionKey> {
    const encryptionKeyResponse: AxiosResponse<CapComEncryptionKey> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}/session/encryptionKey`,
      {
        headers: {
          'X-CAP-API-KEY': this.envConfig.CAPITAL_COM_API_KEY,
        },
      }
    );

    return encryptionKeyResponse.data;
  }

  public async startSession(): Promise<SessionKeys> {
    const session: AxiosResponse<SessionKeys> = await axios.post(
      `${this.envConfig.CAPITAL_COM_URL}/session`,
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

    return this.session;
  }

  public async getCandles(
    symbol: string,
    interval: CapComTimeIntervals,
    limit: number
  ): Promise<CandleChartData[]> {
    if (!this.session) {
      throw new Error('Capital.com session was not started');
    }

    const [from, to] = CapitalComClient.getFromToDate(interval, limit);

    const marketResponse: AxiosResponse<CapComMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}/prices/${symbol}`,
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

    return CapitalComClient.prepareChartData(marketResponse.data);
  }

  static prepareChartData(rawData: CapComMarketData): CandleChartData[] {
    return rawData.prices.map<CandleChartData>((candle) => ({
      openTime: Date.parse(candle.snapshotTime),
      open: (candle.openPrice.ask + candle.openPrice.ask) / 2,
      high: (candle.highPrice.ask + candle.highPrice.ask) / 2,
      low: (candle.lowPrice.ask + candle.lowPrice.ask) / 2,
      close: (candle.closePrice.ask + candle.closePrice.ask) / 2,
      volume: candle.lastTradedVolume,
    }));
  }

  static getFromToDate(interval: CapComTimeIntervals, limit: number): [string, string] {
    const timeBackShift = limit * timeIntervalCapComToMillis(interval);
    const fromDate = chop(new Date(Date.now() - timeBackShift).toISOString());
    const toDate = chop(new Date().toISOString());

    return [fromDate, toDate];
  }
}
