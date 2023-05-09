import { CandlestickChartData } from "./candlestick-chart-data";
import { Subject, Observable } from 'rxjs';

export interface SymbolState {
  symbol: string;
  history: CandlestickChartData[];
  stream$: Observable<CandlestickChartData[]>;
  onTerminate$: Subject<void>;
}
