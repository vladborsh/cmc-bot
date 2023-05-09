import { CandlestickChartData } from "../../interfaces/candlestick-chart-data";
import { Subject, Observable } from 'rxjs';

export interface BinanceSymbolState {
  symbol: string;
  history: CandlestickChartData[];
  stream$: Observable<CandlestickChartData>;
  onTerminate$: Subject<void>;
}
