import { CandleChartInterval_LT } from "binance-api-node";
import { BotStates, GeneralTimeIntervals } from "../enums";

export interface UserState{
  chatId: string;
  dialogState: BotStates;
  lastSelectedCrypto?: string[];
  watchList?: WatchListItem[];
}

export interface WatchListItem {
  name: string;
  timeFrame: GeneralTimeIntervals;
  exchange?: Exchange;
}

export enum Exchange {
  binance = 'binance',
  capitalcom = 'capitalcom',
}
