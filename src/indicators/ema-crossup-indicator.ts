import { EMA, CrossUp } from 'technicalindicators';
import { PlotShape } from "../interfaces/charts/plot-shape.interface";
import { Plot } from "../interfaces/charts/plot.interface";
import { CandlestickChartData } from '../interfaces/charts/candlestick-chart-data';

const PLOT_SHAPE_DEF_COLOR = '#3492eb';
const PLOT_DEF_COLOR = '#9e34eb';

export function EMACrossUpIndicator(chartData: CandlestickChartData[], emaLength: number): [PlotShape[], Plot[]] {
  const ema = EMA.calculate({
    values: chartData.map((candle) => candle.close),
    period: emaLength,
  });

  const crossUp = CrossUp.calculate({
    lineA: ema,
    lineB: chartData.map((candle) => candle.close).slice(emaLength),
  });

  return [
    [{ values: crossUp, color: PLOT_SHAPE_DEF_COLOR }],
    [{ values: ema, color: PLOT_DEF_COLOR }]
  ];
}
