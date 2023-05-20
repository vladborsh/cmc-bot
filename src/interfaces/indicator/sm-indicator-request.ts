import { CandleChartData } from "../charts/candlestick-chart-data";

export interface SmIndicatorRequest {
  chartData: CandleChartData[];
  structureLength?: number;
  internalStructureLength?: number;
  highStructureLength?: number;
}
