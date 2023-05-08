import { EnvConfig } from '../env-config';
import axios, { AxiosResponse } from 'axios';
import { subDays, startOfDay } from 'date-fns';
import {
  CapComEncryptionKey,
  CapComMarketData,
  SessionKeys,
} from '../interfaces/capital-com.interfaces';
import { CandlestickChartData } from '../interfaces/candlestick-chart-data';
import { CapComTimeIntervals } from '../enums';
import { chop } from '../formatting';

export class CapitalComClient {
  constructor(private envConfig: EnvConfig) {}

  async encryptKeys(): Promise<CapComEncryptionKey> {
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

  async startSession(): Promise<SessionKeys> {
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

    return {
      CST: session.headers['cst'],
      X_SECURITY_TOKEN: session.headers['x-security-token'],
    };
  }

  async getDXY(session: SessionKeys, interval: CapComTimeIntervals, limit: number): Promise<CapComMarketData> {
    const marketResponse: AxiosResponse<CapComMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}/prices/DXY`,
      {
        headers: {
          'X-SECURITY-TOKEN': session.X_SECURITY_TOKEN,
          CST: session.CST,
        },
        params: {
          resolution: interval,
          from: chop(startOfDay(subDays(new Date(), 30)).toISOString()),
          to: chop(new Date().toISOString()),
          max: limit,
        },
      }
    );

    return marketResponse.data;
  }

  async getSNP(session: SessionKeys, interval: CapComTimeIntervals, limit: number): Promise<CapComMarketData> {
    const marketResponse: AxiosResponse<CapComMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}/prices/US500`,
      {
        headers: {
          'X-SECURITY-TOKEN': session.X_SECURITY_TOKEN,
          CST: session.CST,
        },
        params: {
          resolution: interval,
          from: chop(startOfDay(subDays(new Date(), 30)).toISOString()),
          to: chop(new Date().toISOString()),
          max: limit,
        },
      }
    );

    return marketResponse.data;
  }

  static prepareChartData(rawData: CapComMarketData): CandlestickChartData[] {
    return rawData.prices.map<CandlestickChartData>((candle) => ({
      openTime: Date.parse(candle.snapshotTime),
      open: (candle.openPrice.ask + candle.openPrice.ask) / 2,
      high: (candle.highPrice.ask + candle.highPrice.ask) / 2,
      low: (candle.lowPrice.ask + candle.lowPrice.ask) / 2,
      close: (candle.closePrice.ask + candle.closePrice.ask) / 2,
      volume: candle.lastTradedVolume,
    }));
  }
}