import { BinanceClient } from './binance-client';
import { CandleChartInterval_LT } from 'binance-api-node';
import { Subject } from 'rxjs';
import { omit } from 'lodash';
import { BinanceSymbolState } from './interfaces/binance-symbol-state.interface';

export class BinanceSymbolStateService {
  record: Record<string, BinanceSymbolState> = {};
  static readonly HISTORY_LIMIT = 10;

  constructor(private binanceClient: BinanceClient) {}

  /**
   * @example
   * const binance = await BinanceClient.getInstance(EnvConfig.getInstance());
   * const state = new BinanceChartState(binance);
   * await state.addSource('BTCUSDT', '1m');
   * const source = state.getSource('BTCUSDT');
   *  */
  public async addSource(symbol: string, interval: CandleChartInterval_LT) {
    const history = await this.binanceClient.getCandles(
      symbol,
      interval,
      BinanceSymbolStateService.HISTORY_LIMIT
    );
    history.pop() // last candle is unfinished
    const onTerminate$ = new Subject<void>();
    const stream$ = this.binanceClient.getCandlesStream(symbol, interval);

    stream$.subscribe((candle) => {
      if (candle.openTime > history[history.length-1].openTime) {
        history.push(candle)
      }
    });

    this.record[symbol] = {
      symbol,
      history,
      stream$,
      onTerminate$,
    };
  }

  public getSource(symbol: string): BinanceSymbolState {
    if (!this.record[symbol]) {
      throw new Error(`there is no symbol: ${symbol}`);
    }
    return this.record[symbol];
  }

  public removeSource(symbol: string) {
    this.record[symbol].onTerminate$.next();
    this.record = omit(this.record, symbol);
  }
}
