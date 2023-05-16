import { BotCommands, BotTransitions } from "../enums";

export const botMessageTextToState: Record<BotCommands, BotTransitions> = {
  [BotCommands.topCrypto]: BotTransitions.GET_TOP_CRYPTO,
  [BotCommands.indices]: BotTransitions.GET_INDICES,
  [BotCommands.watchCrypto]: BotTransitions.WATCH_CRYPTO_BY_NAME,
  [BotCommands.selectCrypto]: BotTransitions.SELECT_CRYPTO_CHART,
  [BotCommands.price24h]: BotTransitions.SELECT_TOP_CRYPTO_SORT,
  [BotCommands.price7d]: BotTransitions.SELECT_TOP_CRYPTO_SORT,
  [BotCommands.volume24h]: BotTransitions.SELECT_TOP_CRYPTO_SORT,
  [BotCommands.yesDrawCharts]: BotTransitions.SELECT_TO_SEE_CRYPTO_CHARTS,
  [BotCommands.noDoNotDraw]: BotTransitions.SELECT_DO_NOT_SEE_CRYPTO_CHARTS,
  [BotCommands.yesShowNews]: BotTransitions.SELECT_TO_SEE_CRYPTO_NEWS,
  [BotCommands.noDoNotShowNews]: BotTransitions.SELECT_DO_NOT_SEE_CRYPTO_NEWS,
  [BotCommands.btcInfo]: BotTransitions.GET_BTC_INFO,
};
