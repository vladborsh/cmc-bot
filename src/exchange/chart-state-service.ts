import { BinanceClient } from './binance-client';
import { CandleChartInterval_LT } from 'binance-api-node';
import { Subject,Observable } from 'rxjs';
import { takeUntil, filter, map, startWith } from 'rxjs/operators';
import { omit } from 'lodash';
import { SymbolState } from './interfaces/symbol-state.interface';
import { CandlestickChartData } from '../interfaces/charts/candlestick-chart-data';

type ChartScript = (data: CandlestickChartData[]) => void;

export class SymbolStateService {
  record: Record<string, SymbolState> = {};
  static readonly HISTORY_LIMIT = 100;

  constructor(private binanceClient: BinanceClient) {}

  /**
   * @example
   * const binance = await BinanceClient.getInstance(EnvConfig.getInstance());
   * const state = new SymbolStateService(binance);
   * await state.addSource('BTCUSDT', '1m');
   * const source = state.getSource('BTCUSDT');
   *  */
  public async addSource(symbol: string, interval: CandleChartInterval_LT): Promise<void> {
    const history = await this.binanceClient.getCandles(
      symbol,
      interval,
      SymbolStateService.HISTORY_LIMIT
    );
    history.pop(); // last candle is unfinished
    const onTerminate$ = new Subject<void>();
    const stream$ = this.binanceClient.getCandlesStream(symbol, interval).pipe(
      filter((candle) => candle.openTime > history[history.length - 1].openTime),
      takeUntil(onTerminate$),
      map(candle => {
        history.push(candle)
        return history;
      }),
      startWith(history),
    );

    this.record[this.createKey(symbol, interval)] = {
      symbol,
      history,
      stream$: stream$,
      onTerminate$,
    };
  }

  public exists(symbol: string, interval: CandleChartInterval_LT): boolean {
    return !!this.record[this.createKey(symbol, interval)];
  }


  public getSource(symbol: string, interval: CandleChartInterval_LT): SymbolState {
    if (!this.record[this.createKey(symbol, interval)]) {
      throw new Error(`there no such source ${this.createKey(symbol, interval)}`)
    }
    return this.record[this.createKey(symbol, interval)];
  }

  public removeSource(symbol: string, interval: CandleChartInterval_LT) {
    this.record[this.createKey(symbol, interval)].onTerminate$.next();
    this.record = omit(this.record, symbol);
  }

  private createKey(symbol: string, interval: CandleChartInterval_LT): string {
    return `${symbol}:${interval}`;
  }
}

