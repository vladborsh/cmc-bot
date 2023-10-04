import { createMachine, interpret, StateMachine } from '@xstate/fsm';
import { BotStates, BotTransitions } from '../enums';

export function createBotState(initial = BotStates.INITIAL): StateMachine.Service<any, any> {
  const machine = createMachine({
    initial,
    states: {
      [BotStates.INITIAL]: {
        on: {
          [BotTransitions.GET_TOP_CRYPTO]: BotStates.FETCH_CRYPTO_CURRENCY,
          [BotTransitions.GET_ASSET_CHART]: BotStates.ACCEPT_ASSET_CHART_NAME,
          [BotTransitions.GET_INDICES]: BotStates.FETCH_INDICES,
          [BotTransitions.GO_TO_WATCH_LIST]: BotStates.WATCHLIST,
          [BotTransitions.GET_BTC_INFO]: BotStates.FETCH_BTC_INFO,
        },
      },
      [BotStates.WATCHLIST]: {
        on: {
          [BotTransitions.ADD_ASSET_TO_WATCH_LIST]: BotStates.ADD_TO_WATCH_LIST_ACCEPT_NAME,
          [BotTransitions.REMOVE_ASSET_FROM_WATCH_LIST]: BotStates.REMOVE_FROM_WATCH_LIST_ACCEPT_NAME,
          [BotTransitions.VIEW_WATCH_LIST]: BotStates.VIEW_WATCH_LIST,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.VIEW_WATCH_LIST]: {
        on: {
          [BotTransitions.GO_TO_WATCH_LIST]: BotStates.WATCHLIST,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.REMOVE_FROM_WATCH_LIST_ACCEPT_NAME]: {
        on: {
          [BotTransitions.REMOVE_ASSET_FROM_WATCH_LIST]: BotStates.REMOVE_FROM_WATCH_LIST,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.REMOVE_FROM_WATCH_LIST]: {
        on: {
          [BotTransitions.REMOVE_ASSET_FROM_WATCH_LIST]: BotStates.REMOVE_FROM_WATCH_LIST,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.ACCEPT_ASSET_CHART_NAME]: {
        on: {
          [BotTransitions.GET_SELECTED_CRYPTO_CHART]: BotStates.FETCH_ASSET_CHART,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.FETCH_ASSET_CHART]: {
        on: {
          [BotTransitions.GET_SELECTED_CRYPTO_CHART]: BotStates.FETCH_ASSET_CHART,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.ADD_TO_WATCH_LIST_ACCEPT_NAME]: {
        on: {
          [BotTransitions.ADD_ASSET_TO_WATCH_LIST_ACCEPT_NAME]: BotStates.ADD_TO_WATCH_LIST,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.ADD_TO_WATCH_LIST]: {
        on: {
          [BotTransitions.ADD_ASSET_TO_WATCH_LIST_ACCEPT_NAME]: BotStates.ADD_TO_WATCH_LIST,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.CRYPTO_CURRENCY_SORT]: {
        on: {
          [BotTransitions.SELECT_TOP_CRYPTO_SORT]: BotStates.FETCH_CRYPTO_CURRENCY,
          [BotTransitions.BACK_FROM_CRYPTO_SORT]: BotStates.INITIAL,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.FETCH_CRYPTO_CURRENCY]: {
        on: {
          [BotTransitions.SELECT_TO_SEE_CRYPTO_CHARTS]: BotStates.CRYPTO_CURRENCY_CHARTS,
          [BotTransitions.SELECT_DO_NOT_SEE_CRYPTO_CHARTS]: BotStates.LATEST_NEWS,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.CRYPTO_CURRENCY_CHARTS]: {
        on: {
          [BotTransitions.GO_TO_CRYPTO_NEWS]: BotStates.LATEST_NEWS,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.LATEST_NEWS]: {
        on: {
          [BotTransitions.SELECT_TO_SEE_CRYPTO_NEWS]: BotStates.FETCH_LATEST_NEWS,
          [BotTransitions.SELECT_DO_NOT_SEE_CRYPTO_NEWS]: BotStates.INITIAL,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.FETCH_LATEST_NEWS]: {
        on: {
          [BotTransitions.NEWS_SELECTED]: BotStates.INITIAL,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.FETCH_INDICES]: {
        on: {
          [BotTransitions.INDICES_SELECTED]: BotStates.INITIAL,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.FETCH_BTC_INFO]: {
        on: {
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
    },
  });

  return interpret(machine);
}
