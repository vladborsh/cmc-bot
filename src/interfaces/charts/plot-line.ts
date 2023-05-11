export interface PlotLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  style?: PlotLineStyle;
}

export enum PlotLineStyle{
  Solid,
  Dashed,
}
