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

export class BinanceClient {
  client: BinanceConnect;
  static exchangeInfo: ExchangeInfo;

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

  private static async loadExchangeInfo() {
    this.exchangeInfo = await this.instance.client.exchangeInfo();
  }

  public async getCandles(
    symbol: string,
    interval: CandleChartInterval_LT,
    limit: number
  ): Promise<CandleChartData[]> {
    const rawCandles = await this.client.candles({ symbol, interval, limit });

    return BinanceClient.mapCandleChartResult(rawCandles);
  }

  public getCandlesStream(
    symbol: string,
    interval: CandleChartInterval_LT
  ): Observable<CandleChartData> {
    return new Observable((observer: Observer<CandleChartData>) => {
      const clean = this.client.ws.candles(symbol, interval, (candle) =>{
        if (candle.isFinal) {
          observer.next(BinanceClient.mapCandle(candle, interval))
        }
      });

      return () => clean();
    });
  }

  public static async isSymbolExists(symbolToCheck: string): Promise<boolean> {
    if (!this.exchangeInfo) {
      await this.loadExchangeInfo();
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
