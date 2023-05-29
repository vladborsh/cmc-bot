import TelegramBot from 'node-telegram-bot-api';
import { StateMachine } from '@xstate/fsm';
import { BotCommands, BotStates, BotTransitions } from '../enums';
import { BotStateHandler } from './types';
import { InitialMessageAction } from './actions/initial-message-action';
import { SortCryptoMessageAction } from './actions/sort-crypto-message-action';
import { AcceptAssetNameChartAction } from './actions/accept-asset-name-chart-action';
import { FetchAssetChartAction } from './actions/fetch-asset-chart-action';
import { EnvConfig } from '../env-config';
import { DynamicConfig } from '../dynamic-config';
import { WatchlistMenuAction } from './actions/watchlist-menu-action';
import { ViewWatchlistAction } from './actions/view-watchlist-action';
import { DynamoDBClient } from '../db/dynamo-db-client';
import { AcceptAssetNameRemoveWatchlistAction } from './actions/accept-asset-name-remove-watchlist-action';
import { RemoveWatchlistAssetAction } from './actions/remove-watchlist-asset-action';
import { AssetWatchListProcessor } from '../exchange/asset-watch-list-processor';
import { BinanceClient } from '../exchange/binance-client';
import { CapitalComClient } from '../exchange/capital-com-client';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import { AcceptAssetNameAddWatchlistAction } from './actions/accept-asset-name-add-watchlist-action';
import { AddAssetToWatchlistAction } from './actions/add-watchlist-asset-action';
import { SelectCryptoAction } from './actions/select-crypto-action';
import { Requests } from '../requests';
import { RenderCryptoChartsAction } from './actions/render-crypto-charts-action';
import { SelectNewsAction } from './actions/select-news-action';
import { AskAboutNewsMessageAction } from './actions/ask-about-news-message-action';
import { IndicesChartAction } from './actions/indices-chart-actions';
import { BtcChartAction } from './actions/btc-chart-action';
import { CapitalComSession } from '../exchange/capital-com-session';
import { CapitalComWebsocket } from '../exchange/capital-com-websocket';
import { WatchListLogger } from '../utils/watchlist-logger';

function getDependencies() {
  const envConfig = EnvConfig.getInstance();
  const watcherLogger = WatchListLogger.getInstance(envConfig);
  const dynamicConfig = DynamicConfig.getInstance(envConfig);
  const dynamoDBClient = DynamoDBClient.getInstance(envConfig);
  const binanceClient = BinanceClient.getInstance(envConfig);
  const capitalComSession = CapitalComSession.getInstance(envConfig);
  const capitalComWebsocket = CapitalComWebsocket.getInstance(
    envConfig,
    capitalComSession.session$,
    () => capitalComSession.checkAndRenewSession(),
    watcherLogger
  );
  const capitalComClient = CapitalComClient.getInstance(
    envConfig,
    capitalComSession,
    capitalComWebsocket
  );

  return {
    envConfig,
    watcherLogger,
    dynamicConfig,
    dynamoDBClient,
    binanceClient,
    capitalComSession,
    capitalComWebsocket,
    capitalComClient,
  };
}

export const stateActions: Record<BotStates, BotStateHandler> = {
  [BotStates.INITIAL]: async (bot: TelegramBot, message: TelegramBot.Message) => {
    const action = new InitialMessageAction(bot);
    await action.execute(message.chat.id);
  },
  [BotStates.CRYPTO_CURRENCY_SORT]: async (bot: TelegramBot, message: TelegramBot.Message) => {
    const action = new SortCryptoMessageAction(bot);
    await action.execute(message.chat.id);
  },
  [BotStates.ACCEPT_ASSET_CHART_NAME]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const action = new AcceptAssetNameChartAction(bot);
    await action.execute(message.chat.id);
    state.send(BotTransitions.GET_SELECTED_CRYPTO_CHART);
  },
  [BotStates.FETCH_ASSET_CHART]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    /* FIXME: shim for ignoring previous chat input */
    if (message.text?.includes(BotCommands.assetChart)) {
      return;
    }
    if (message.text?.toLowerCase().includes('stop')) {
      state.send(BotTransitions.BACK_TO_START);
      return;
    }
    try {
      const deps = getDependencies();
      const action = new FetchAssetChartAction(
        deps.envConfig,
        DynamicConfig.getInstance(deps.envConfig),
        deps.binanceClient,
        deps.capitalComClient,
        bot
      );
      await action.execute(message);
    } catch (e) {
      state.send(BotTransitions.GET_SELECTED_CRYPTO_CHART);
      return;
    }
    state.send(BotTransitions.BACK_TO_START);
  },
  [BotStates.WATCHLIST]: async (bot: TelegramBot, message: TelegramBot.Message) => {
    const action = new WatchlistMenuAction(bot);
    await action.execute(message.chat.id);
  },
  [BotStates.VIEW_WATCH_LIST]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const action = new ViewWatchlistAction(
      DynamoDBClient.getInstance(EnvConfig.getInstance()),
      bot
    );
    await action.execute(message.chat.id);
    state.send(BotTransitions.GO_TO_WATCH_LIST);
  },
  [BotStates.REMOVE_FROM_WATCH_LIST_ACCEPT_NAME]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const action = new AcceptAssetNameRemoveWatchlistAction(bot);
    await action.execute(message.chat.id);
    state.send(BotTransitions.REMOVE_ASSET_FROM_WATCH_LIST);
  },
  [BotStates.REMOVE_FROM_WATCH_LIST]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    /* FIXME: shim for ignoring previous chat input */
    if (message.text?.includes(BotCommands.removeFromWatchlist)) {
      return;
    }
    if (message.text?.toLowerCase().includes('stop')) {
      state.send(BotTransitions.BACK_TO_START);
      return;
    }
    try {
      const deps = getDependencies();
      const assetWatchListProcessor = AssetWatchListProcessor.getInstance(
        deps.envConfig,
        deps.dynamoDBClient,
        TechIndicatorService.getInstance(deps.envConfig),
        deps.binanceClient,
        deps.capitalComClient,
        deps.dynamicConfig,
        bot
      );
      const action = new RemoveWatchlistAssetAction(
        deps.envConfig,
        deps.dynamicConfig,
        bot,
        deps.dynamoDBClient,
        assetWatchListProcessor
      );
      await action.execute(message);
    } catch (e) {
      state.send(BotTransitions.REMOVE_ASSET_FROM_WATCH_LIST);
      return;
    }
    state.send(BotTransitions.BACK_TO_START);
  },
  [BotStates.ADD_TO_WATCH_LIST_ACCEPT_NAME]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const action = new AcceptAssetNameAddWatchlistAction(bot);
    await action.execute(message.chat.id);
    state.send(BotTransitions.ADD_ASSET_TO_WATCH_LIST_ACCEPT_NAME);
  },
  [BotStates.ADD_TO_WATCH_LIST]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    /* FIXME: shim for ignoring previous chat input */
    if (message.text?.includes(BotCommands.addToWatchlist)) {
      return;
    }
    if (message.text?.toLowerCase().includes('stop')) {
      state.send(BotTransitions.BACK_TO_START);
      return;
    }
    try {
      const deps = getDependencies();
      const assetWatchListProcessor = AssetWatchListProcessor.getInstance(
        deps.envConfig,
        deps.dynamoDBClient,
        TechIndicatorService.getInstance(deps.envConfig),
        deps.binanceClient,
        deps.capitalComClient,
        deps.dynamicConfig,
        bot
      );
      const action = new AddAssetToWatchlistAction(
        deps.envConfig,
        deps.dynamicConfig,
        bot,
        deps.dynamoDBClient,
        assetWatchListProcessor
      );
      await action.execute(message);
    } catch (e) {
      state.send(BotTransitions.ADD_ASSET_TO_WATCH_LIST_ACCEPT_NAME);
      return;
    }
    state.send(BotTransitions.BACK_TO_START);
  },
  [BotStates.FETCH_CRYPTO_CURRENCY]: async (bot: TelegramBot, message: TelegramBot.Message) => {
    const envConfig = EnvConfig.getInstance();
    const action = new SelectCryptoAction(
      DynamicConfig.getInstance(envConfig),
      bot,
      DynamoDBClient.getInstance(envConfig),
      new Requests(envConfig)
    );
    await action.execute(message);
  },
  [BotStates.CRYPTO_CURRENCY_CHARTS]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const envConfig = EnvConfig.getInstance();
    const dynamicConfig = DynamicConfig.getInstance(envConfig);
    const dynamoDBClient = DynamoDBClient.getInstance(envConfig);
    const action = new RenderCryptoChartsAction(envConfig, dynamicConfig, bot, dynamoDBClient);
    await action.execute(message.chat.id);
    state.send(BotTransitions.GO_TO_CRYPTO_NEWS);
  },
  [BotStates.LATEST_NEWS]: async (bot: TelegramBot, message: TelegramBot.Message) => {
    const action = new AskAboutNewsMessageAction(bot);
    await action.execute(message.chat.id);
  },
  [BotStates.FETCH_LATEST_NEWS]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const envConfig = EnvConfig.getInstance();
    const dynamicConfig = DynamicConfig.getInstance(envConfig);
    const dynamoDBClient = DynamoDBClient.getInstance(envConfig);
    const action = new SelectNewsAction(
      dynamicConfig,
      bot,
      dynamoDBClient,
      new Requests(envConfig)
    );
    await action.execute(message.chat.id);
    state.send(BotTransitions.NEWS_SELECTED);
  },
  [BotStates.FETCH_INDICES]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const deps = getDependencies();
    const action = new IndicesChartAction(
      deps.envConfig,
      deps.dynamicConfig,
      deps.capitalComClient,
      bot
    );
    await action.execute(message.chat.id);
    state.send(BotTransitions.INDICES_SELECTED);
  },
  [BotStates.FETCH_BTC_INFO]: async (
    bot: TelegramBot,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    const envConfig = EnvConfig.getInstance();
    const dynamicConfig = DynamicConfig.getInstance(envConfig);
    const binanceClient = BinanceClient.getInstance(envConfig);
    const action = new BtcChartAction(envConfig, dynamicConfig, binanceClient, bot);
    await action.execute(message.chat.id);
    state.send(BotTransitions.BACK_TO_START);
  },
};
