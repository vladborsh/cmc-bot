import { EMA, CrossUp } from 'technicalindicators';
import { PlotShape } from "../interfaces/charts/plot-shape.interface";
import { Plot } from "../interfaces/charts/plot.interface";
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';

const PLOT_SHAPE_DEF_COLOR = '#3492eb';
const PLOT_DEF_COLOR = '#9e34eb';

/**
 * @example
 * const candles = await binanceClient.getCandles(symbol, '1h', 80);
 * const [plotshapes, plots] = EMACrossUpIndicator(candles, 15);
 * const img = chartSnapshot.generateImage(candles, plotshapes, plots);
 */
export function EMACrossUpIndicator(chartData: CandleChartData[], emaLength: number): [PlotShape[], Plot[]] {
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
