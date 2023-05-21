export enum BotCommands {
  topCrypto = 'Top Crypto',
  indices = 'Indices DXY and SnP',
  watchCrypto = 'Watch crypto',
  addToWatchlist = 'Add to watchlist',
  removeFromWatchlist = 'Remove from watchlist',
  viewWatchlist = 'View watchlist',
  selectCrypto = 'Select crypto chart',
  price24h = 'Price change 24h',
  price7d = 'Price change 7d',
  volume24h = 'Volume change 24h',
  yesDrawCharts = 'Yep, draw it',
  noDoNotDraw = 'No, do not draw',
  yesShowNews = 'Yes, show news',
  noDoNotShowNews = 'No, do not show news',
  btcInfo = 'BTC',
  back = 'Back',
}

export enum GeneralTimeIntervals {
  m1 = 'm1',
  m5 = 'm5',
  m15 = 'm15',
  m30 = 'm30',
  h1 = 'h1',
  h4 = 'h4',
  d1 = 'd1',
  w1 = 'w1',
}

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

export enum CapitalComPriceType {
  ask = 'ask',
  bid = 'bid',
}

export enum CapComCandleType {
  classic = 'classic',
  heikinAshi = 'heikin-ashi',
}

export enum BotStates {
  INITIAL = 'INITIAL',
  CRYPTO_CURRENCY_SORT = 'CRYPTO_CURRENCY_SORT',
  ACCEPT_CRYPTO_CHART_NAME = 'ACCEPT_CRYPTO_CHART_NAME',
  FETCH_SELECTED_CRYPTO_CHART = 'FETCH_SELECTED_CRYPTO_CHART',
  FETCH_CRYPTO_CURRENCY = 'FETCH_CRYPTO_CURRENCY',
  CRYPTO_CURRENCY_CHARTS = 'CRYPTO_CURRENCY_CHARTS',
  LATEST_NEWS = 'LATEST_NEWS',
  FETCH_LATEST_NEWS = 'FETCH_LATEST_NEWS',
  FETCH_INDICES = 'FETCH_INDICIES',
  WATCHLIST = 'WATCHLIST',
  ADD_TO_WATCH_LIST_ACCEPT_NAME = 'ADD_TO_WATCH_LIST_ACCEPT_NAME',
  REMOVE_FROM_WATCH_LIST_ACCEPT_NAME = 'REMOVE_FROM_WATCH_LIST_ACCEPT_NAME',
  ADD_TO_WATCH_LIST = 'ADD_TO_WATCH_LIST',
  REMOVE_FROM_WATCH_LIST = 'REMOVE_FROM_WATCH_LIST',
  VIEW_WATCH_LIST = 'VIEW_WATCH_LIST',
  FETCH_BTC_INFO = 'FETCH_BTC_INFO'
}

export enum BotTransitions {
  GET_TOP_CRYPTO = 'GET_TOP_CRYPTO',
  SELECT_CRYPTO_CHART = 'SELECT_CRYPTO_CHART',
  GET_SELECTED_CRYPTO_CHART = 'GET_SELECTED_CRYPTO_CHART',
  GO_TO_WATCH_LIST = 'GO_TO_WATCH_LIST',
  ADD_CRYPTO_TO_WATCH_LIST = 'ADD_CRYPTO_TO_WATCH_LIST',
  REMOVE_CRYPTO_FROM_WATCH_LIST = 'REMOVE_CRYPTO_FROM_WATCH_LIST',
  VIEW_WATCH_LIST = 'VIEW_WATCH_LIST',
  ADD_CRYPTO_TO_WATCH_LIST_ACCEPT_NAME = 'ADD_CRYPTO_TO_WATCH_LIST_ACCEPT_NAME',
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
  BACK_TO_START = 'BACK_TO_START',
  GET_BTC_INFO = 'GET_BTC_INFO'
}

