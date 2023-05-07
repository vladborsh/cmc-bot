import Binance, {
  Binance as BinanceConnect,
  ExchangeInfo,
  CandleChartResult,
  Symbol,
} from 'binance-api-node';
import { EnvConfig } from '../env-config';
import { CandlestickChartData } from '../interfaces/candlestick-chart-data';
import { BinanceTimeIntervals } from '../enums';

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

  public static async getInstance(envConfig: EnvConfig): Promise<BinanceClient> {
    if (!this.instance) {
      this.instance = new BinanceClient(envConfig);
      await this.loadExchangeInfo();
    }

    return this.instance;
  }

  private static async loadExchangeInfo() {
    this.exchangeInfo = await this.instance.client.exchangeInfo();
  }

  public async getCandles(
    symbol: string,
    interval: BinanceTimeIntervals,
    limit: number
  ): Promise<CandleChartResult[]> {
    return await this.client.candles({ symbol, interval, limit });
  }

  public static isSymbolExists(symbolToCheck: string): boolean {
    if (!this.exchangeInfo) {
      throw new Error('exchange info was not laded');
    }

    return this.exchangeInfo.symbols.some(
      (symbolInfo: Symbol) => symbolInfo.symbol === symbolToCheck
    );
  }

  public static prepareChartData(chartResult: CandleChartResult[]): CandlestickChartData[] {
    return chartResult.map<CandlestickChartData>(kline => ({
      open: parseFloat(kline.open),
      close: parseFloat(kline.close),
      high: parseFloat(kline.high),
      low: parseFloat(kline.low),
      openTime: kline.openTime,
      closeTime: kline.closeTime,
      volume: parseFloat(kline.volume),
    }));
  }
}
