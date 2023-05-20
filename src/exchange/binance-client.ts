import Binance, {
  Binance as BinanceConnect,
  ExchangeInfo,
  CandleChartResult,
  Symbol,
  Candle,
  CandleChartInterval_LT,
} from 'binance-api-node';
import { EnvConfig } from '../env-config';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { Observable, Observer } from 'rxjs';
import { timeIntervalBinanceToMillis } from './exchange-helpers';
import { IExchangeClient } from '../interfaces/exchange-client.interface';
import { GeneralTimeIntervals } from '../enums';

export class BinanceClient implements IExchangeClient {
  client: BinanceConnect;
  exchangeInfo: ExchangeInfo | undefined;

  private mapGeneralTimeInterval: Record<GeneralTimeIntervals, CandleChartInterval_LT> = {
    [GeneralTimeIntervals.m1]: '1m',
    [GeneralTimeIntervals.m5]: '5m',
    [GeneralTimeIntervals.m15]: '15m',
    [GeneralTimeIntervals.m30]: '30m',
    [GeneralTimeIntervals.h1]: '1h',
    [GeneralTimeIntervals.h4]: '4h',
    [GeneralTimeIntervals.d1]: '1d',
    [GeneralTimeIntervals.w1]: '1w',
  };

  static instance: BinanceClient;

  private constructor(envConfig: EnvConfig) {
    this.client = Binance({
      apiKey: envConfig.BINANCE_API_KEY,
      apiSecret: envConfig.BINANCE_API_KEY,
    });
  }

  public static getInstance(envConfig: EnvConfig): BinanceClient {
    if (!this.instance) {
      this.instance = new BinanceClient(envConfig);
    }

    return this.instance;
  }

  async init() {
    this.exchangeInfo = await this.client.exchangeInfo();
  }

  public async getCandles(
    asset: string,
    interval: GeneralTimeIntervals,
    limit: number
  ): Promise<CandleChartData[]> {
    const rawCandles = await this.client.candles({
      symbol: asset,
      interval: this.mapGeneralTimeInterval[interval],
      limit,
    });

    return BinanceClient.mapCandleChartResult(rawCandles);
  }

  public getCandlesStream(
    asset: string,
    interval: GeneralTimeIntervals
  ): Observable<CandleChartData> {
    return new Observable((observer: Observer<CandleChartData>) => {
      const clean = this.client.ws.candles(asset, this.mapGeneralTimeInterval[interval], (candle) => {
        if (candle.isFinal) {
          observer.next(BinanceClient.mapCandle(candle, this.mapGeneralTimeInterval[interval]));
        }
      });

      return () => clean();
    });
  }

  public async isSymbolExists(symbolToCheck: string): Promise<boolean> {
    if (!this.exchangeInfo) {
      throw new Error('client is not initialized. call "init" before');
    }

    return this.exchangeInfo.symbols.some(
      (symbolInfo: Symbol) => symbolInfo.symbol === symbolToCheck
    );
  }

  private static mapCandleChartResult(chartResult: CandleChartResult[]): CandleChartData[] {
    return chartResult.map<CandleChartData>((kline) => ({
      open: parseFloat(kline.open),
      close: parseFloat(kline.close),
      high: parseFloat(kline.high),
      low: parseFloat(kline.low),
      openTime: kline.openTime,
      closeTime: kline.closeTime,
      volume: parseFloat(kline.volume),
    }));
  }

  private static mapCandle(candle: Candle, interval: CandleChartInterval_LT): CandleChartData {
    return {
      open: parseFloat(candle.open),
      close: parseFloat(candle.close),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      openTime: Date.now() - timeIntervalBinanceToMillis(interval),
      volume: parseFloat(candle.volume),
    };
  }
}
