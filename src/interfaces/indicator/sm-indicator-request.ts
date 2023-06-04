import { CandleChartData } from '../charts/candlestick-chart-data';

export interface SmIndicatorRequest {
  inputs?: SmIndicatorInputs;
  chartData: CandleChartData[];
}

export interface SmIndicatorInputs {
  structureLength?: number;
  internalStructureLength?: number;
  highStructureLength?: number;
  sessions?: SmIndicatorSessions[];
  isEODShown?: boolean;
}

interface SmIndicatorSessions {
  name?: string;
  hourStart: number;
  hourEnd: number;
}
