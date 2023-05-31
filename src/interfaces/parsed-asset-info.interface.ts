import { GeneralTimeIntervals } from "../enums";
import { Exchange } from "./user-state.interface";

export interface ParsedAssetInfo {
  asset: string,
  timeFrame: GeneralTimeIntervals,
  exchange: Exchange,
}
