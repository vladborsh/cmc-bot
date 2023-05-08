export enum BotCommands {
  topCrypto = 'Top Crypto',
  indices = 'Indices DXY and SnP',
  price24h = 'Price change 24h',
  price7d = 'Price change 7d',
  volume24h = 'Volume change 24h',
  yesDrawCharts = 'Yep, draw it',
  noDoNotDraw = 'No, do not draw',
  yesShowNews = 'Yes, show news',
  noDoNotShowNews = 'No, do not show news',
}

export enum BinanceTimeIntervals {
  ONE_HOUR = '1h',
};

export enum CapComTimeIntervals {
  MINUTE = 'MINUTE',
  MINUTE_5 = 'MINUTE_5',
  MINUTE_15 = 'MINUTE_15',
  MINUTE_30 = 'MINUTE_30',
  HOUR = 'HOUR',
  HOUR_4 = 'HOUR_4',
  DAY = 'DAY',
  WEEK = 'WEEK',
}

export enum BotStates {
  INITIAL = 'INITIAL',
  CRYPTO_CURRENCY_SORT = 'CRYPTO_CURRENCY_SORT',
  FETCH_CRYPTO_CURRENCY = 'FETCH_CRYPTO_CURRENCY',
  CRYPTO_CURRENCY_CHARTS = 'CRYPTO_CURRENCY_CHARTS',
  LATEST_NEWS = 'LATEST_NEWS',
  FETCH_LATEST_NEWS = 'FETCH_LATEST_NEWS',
  FETCH_INDICES = 'FETCH_INDICIES',
}

export enum BotTransitions {
  GET_TOP_CRYPTO = 'GET_TOP_CRYPTO',
  SELECT_TOP_CRYPTO_SORT = 'SELECT_TOP_CRYPTO_SORT',
  BACK_FROM_CRYPTO_SORT = 'BACK_FROM_CRYPTO_SORT',
  SELECT_TO_SEE_CRYPTO_CHARTS = 'SELECT_TO_SEE_CRYPTO_CHARTS',
  SELECT_DO_NOT_SEE_CRYPTO_CHARTS = 'SELECT_DO_NOT_SEE_CRYPTO_CHARTS',
  GO_TO_CRYPTO_NEWS = 'GO_TO_CRYPTO_NEWS',
  SELECT_TO_SEE_CRYPTO_NEWS = 'SELECT_TO_SEE_CRYPTO_NEWS',
  SELECT_DO_NOT_SEE_CRYPTO_NEWS = 'SELECT_DO_NOT_SEE_CRYPTO_NEWS',
  NEWS_SELECTED = 'NEWS_SELECTED',
  GET_INDICES = 'GET_INDICES',
  INDICES_SELECTED = 'INDICES_SELECTED',
}

