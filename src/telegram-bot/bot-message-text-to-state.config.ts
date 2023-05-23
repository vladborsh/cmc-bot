import { BotCommands, BotTransitions } from "../enums";

export const botMessageTextToState: Record<BotCommands, BotTransitions> = {
  [BotCommands.topCrypto]: BotTransitions.GET_TOP_CRYPTO,
  [BotCommands.indices]: BotTransitions.GET_INDICES,
  [BotCommands.watchlist]: BotTransitions.GO_TO_WATCH_LIST,
  [BotCommands.addToWatchlist]: BotTransitions.ADD_ASSET_TO_WATCH_LIST,
  [BotCommands.removeFromWatchlist]: BotTransitions.REMOVE_ASSET_FROM_WATCH_LIST,
  [BotCommands.viewWatchlist]: BotTransitions.VIEW_WATCH_LIST,
  [BotCommands.getAssetChart]: BotTransitions.GET_ASSET_CHART,
  [BotCommands.price24h]: BotTransitions.SELECT_TOP_CRYPTO_SORT,
  [BotCommands.price7d]: BotTransitions.SELECT_TOP_CRYPTO_SORT,
  [BotCommands.volume24h]: BotTransitions.SELECT_TOP_CRYPTO_SORT,
  [BotCommands.yesDrawCharts]: BotTransitions.SELECT_TO_SEE_CRYPTO_CHARTS,
  [BotCommands.noDoNotDraw]: BotTransitions.SELECT_DO_NOT_SEE_CRYPTO_CHARTS,
  [BotCommands.yesShowNews]: BotTransitions.SELECT_TO_SEE_CRYPTO_NEWS,
  [BotCommands.noDoNotShowNews]: BotTransitions.SELECT_DO_NOT_SEE_CRYPTO_NEWS,
  [BotCommands.btcInfo]: BotTransitions.GET_BTC_INFO,
  [BotCommands.back]: BotTransitions.BACK_TO_START,
};
