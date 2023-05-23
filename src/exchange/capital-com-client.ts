import { EnvConfig } from '../env-config';
import axios, { AxiosResponse } from 'axios';
import { differenceInMinutes } from 'date-fns';
import {
  CapComEncryptionKey,
  CapComMarketData,
  SessionKeys,
} from '../interfaces/capital-com.interfaces';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { GeneralTimeIntervals } from '../enums';
import { IExchangeClient } from '../interfaces/exchange-client.interface';
import { BehaviorSubject, Observable } from 'rxjs';
import { mapGeneralTimeIntervalToCapCom } from './configs/capital-com-client.config';
import { CapitalComMarketMarketData } from './configs/capital-com-market-data.interface';
import { getFromToDate, mapMarketDataToChartData } from './configs/capital-com.helpers';
import { CapitalComWebsocket } from './capital-com-websocket';

export class CapitalComClient implements IExchangeClient {
  private SESSION_LIFETIME_MINUTES = 9;
  private session$ = new BehaviorSubject<SessionKeys>({
    CST: '',
    X_SECURITY_TOKEN: '',
  });
  private sessionStartTime: number = 0;
  private webSocketCtrl = new CapitalComWebsocket(this.envConfig, this.session$, () => this.checkAndRenewSession());
  static instance: CapitalComClient;

  private constructor(private envConfig: EnvConfig) {}

  public static getInstance(envConfig: EnvConfig): CapitalComClient {
    if (!this.instance) {
      this.instance = new CapitalComClient(envConfig);
    }

    return this.instance;
  }

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
    await this.renewSession();

    this.webSocketCtrl.init();
  }

  public async renewSession(): Promise<void> {
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

    this.sessionStartTime = Date.now();
    this.session$.next({
      CST: session.headers['cst'],
      X_SECURITY_TOKEN: session.headers['x-security-token'],
    });
  }

  public async checkAndRenewSession(): Promise<void> {
    if (
      !this.session$.getValue().CST ||
      !this.session$.getValue().X_SECURITY_TOKEN ||
      differenceInMinutes(new Date(), new Date(this.sessionStartTime)) >=
        this.SESSION_LIFETIME_MINUTES
    ) {
      await this.renewSession();
    }
  }

  public async getCandles(
    symbol: string,
    interval: GeneralTimeIntervals,
    limit: number
  ): Promise<CandleChartData[]> {
    await this.checkAndRenewSession();

    const [from, to] = getFromToDate(mapGeneralTimeIntervalToCapCom[interval], limit);

    const marketResponse: AxiosResponse<CapComMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/prices/${symbol}`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.session$.getValue().X_SECURITY_TOKEN,
          CST: this.session$.getValue().CST,
        },
        params: {
          resolution: mapGeneralTimeIntervalToCapCom[interval],
          from,
          to,
          max: limit,
        },
      }
    );

    console.log(
      symbol,
      interval,
      limit,
      marketResponse.data.prices.length,
      from,
      marketResponse.data.prices[0].snapshotTime
    );

    return mapMarketDataToChartData(marketResponse.data);
  }

  public getCandlesStream(
    asset: string,
    interval: GeneralTimeIntervals
  ): Observable<CandleChartData> {
    return this.webSocketCtrl.getCandlesStream(asset, interval);
  }

  public async getMarketData(): Promise<CapitalComMarketMarketData> {
    if (!this.session$.getValue()) {
      throw new Error('Capital.com session was not started');
    }

    const response: AxiosResponse<CapitalComMarketMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/marketnavigation`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.session$.getValue().X_SECURITY_TOKEN,
          CST: this.session$.getValue().CST,
        },
      }
    );

    return response.data;
  }

  public async getMarketSearch(search: string): Promise<any> {
    if (!this.session$.getValue()) {
      throw new Error('Capital.com session was not started');
    }

    const response: AxiosResponse<any> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/markets?searchTerm=${search}`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.session$.getValue().X_SECURITY_TOKEN,
          CST: this.session$.getValue().CST,
        },
      }
    );

    return response.data;
  }
}
