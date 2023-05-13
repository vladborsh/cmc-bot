import { BotStates } from "../../enums";

export interface UserState{
  chatId: string;
  dialogState: BotStates;
  lastSelectedCrypto?: string[];
  watchList?: WatchListItem[];
}

export interface WatchListItem {
  name: string;
  timeFrame: string;
}
