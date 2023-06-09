import { HorizontalPlotLine } from '../../interfaces/charts/horizontal-plot-line';
import { PlotLine } from '../../interfaces/charts/plot-line';
import { PlotShape } from '../../interfaces/charts/plot-shape.interface';
import { Plot } from '../../interfaces/charts/plot.interface';
import { VerticalPlotLine } from '../../interfaces/charts/vertial-plot-line';
import { PlotRectangle } from '../charts/plot-rectangle';
import { PremDisc, Trend } from './sm-indicator-enums';

export interface SmIndicatorResponse {
  errors?: string[];
  data?: ChartDrawingsData;
}

export interface ChartDrawingsData {
  plots?: Plot[];
  plotShapes?: PlotShape[];
  lines?: PlotLine[];
  alerts?: string[];
  verticalLines?: VerticalPlotLine[];
  horizontalLines?: HorizontalPlotLine[];
  plotRectangles?: PlotRectangle[];
  insights?: SmIndicatorInsights;
}

export interface SmIndicatorInsights {
  trend: Trend,
  premDisc: PremDisc,
  bearishBos: boolean,
  bullishBos: boolean,
}
