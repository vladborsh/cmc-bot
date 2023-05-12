import { PlotLine } from "../../interfaces/charts/plot-line";
import { PlotShape } from "../../interfaces/charts/plot-shape.interface";
import { Plot } from "../../interfaces/charts/plot.interface";

export interface SmIndicatorResponse {
  errors?: string[]
  data?: {
    plots: Plot[];
    plotShapes: PlotShape[];
    lines: PlotLine[];
  }
}
