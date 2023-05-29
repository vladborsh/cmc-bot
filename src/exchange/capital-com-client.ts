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
import { Logger } from 'winston';
import { CapitalComSession } from './capital-com-session';
export class CapitalComClient implements IExchangeClient {
  static instance: CapitalComClient;

  private constructor(
    private envConfig: EnvConfig,
    private capitalComSession: CapitalComSession,
    private capitalComWebsocket: CapitalComWebsocket
  ) {}

  public static getInstance(
    envConfig: EnvConfig,
    capitalComSession: CapitalComSession,
    capitalComWebsocket: CapitalComWebsocket
  ): CapitalComClient {
    if (!this.instance) {
      this.instance = new CapitalComClient(envConfig, capitalComSession, capitalComWebsocket);
    }

    return this.instance;
  }

  public async init(): Promise<void> {
    await this.capitalComSession.renewSession();
    this.capitalComWebsocket.init();
  }

  public async getCandles(
    symbol: string,
    interval: GeneralTimeIntervals,
    limit: number
  ): Promise<CandleChartData[]> {
    await this.capitalComSession.checkAndRenewSession();

    const [from, to] = getFromToDate(mapGeneralTimeIntervalToCapCom[interval], limit);

    const marketResponse: AxiosResponse<CapComMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/prices/${symbol}`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.capitalComSession.session$.getValue().X_SECURITY_TOKEN,
          CST: this.capitalComSession.session$.getValue().CST,
        },
        params: {
          resolution: mapGeneralTimeIntervalToCapCom[interval],
          from,
          to,
          max: limit,
        },
      }
    );

    return mapMarketDataToChartData(marketResponse.data);
  }

  public getCandlesStream(
    asset: string,
    interval: GeneralTimeIntervals
  ): Observable<CandleChartData> {
    return this.capitalComWebsocket.getCandlesStream(asset, interval);
  }

  public async getMarketData(): Promise<CapitalComMarketMarketData> {
    if (!this.capitalComSession.session$.getValue()) {
      throw new Error('Capital.com session was not started');
    }

    const response: AxiosResponse<CapitalComMarketMarketData> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/marketnavigation`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.capitalComSession.session$.getValue().X_SECURITY_TOKEN,
          CST: this.capitalComSession.session$.getValue().CST,
        },
      }
    );

    return response.data;
  }

  public async getMarketSearch(search: string): Promise<any> {
    if (!this.capitalComSession.session$.getValue()) {
      throw new Error('Capital.com session was not started');
    }

    const response: AxiosResponse<any> = await axios.get(
      `${this.envConfig.CAPITAL_COM_URL}api/v1/markets?searchTerm=${search}`,
      {
        headers: {
          'X-SECURITY-TOKEN': this.capitalComSession.session$.getValue().X_SECURITY_TOKEN,
          CST: this.capitalComSession.session$.getValue().CST,
        },
      }
    );

    return response.data;
  }
}
