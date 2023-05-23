import { CapComTimeIntervals } from "../enums";
import { WSCapComMarketData } from "../interfaces/capital-com.interfaces";
import { CandleChartData } from "../interfaces/charts/candlestick-chart-data";

export interface EpicObject {
  epic: string;
  interval: CapComTimeIntervals;
}

export interface BidAsk {
  bid?: WSCapComMarketData;
  ask?: WSCapComMarketData;
}

export interface EpicDataWSEvent {
  epic: string;
  data: CandleChartData;
}
