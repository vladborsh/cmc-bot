import { createMachine, interpret, StateMachine } from '@xstate/fsm';
import { BotStates, BotTransitions } from '../enums';

export function createBotState(initial = BotStates.INITIAL): StateMachine.Service<any, any> {
  const machine = createMachine({
    initial,
    states: {
      [BotStates.INITIAL]: {
        on: {
          [BotTransitions.GET_TOP_CRYPTO]: BotStates.CRYPTO_CURRENCY_SORT,
          [BotTransitions.SELECT_CRYPTO_CHART]: BotStates.ACCEPT_CRYPTO_CHART_NAME,
          [BotTransitions.GET_INDICES]: BotStates.FETCH_INDICES,
          [BotTransitions.WATCH_CRYPTO_BY_NAME]: BotStates.ACCEPT_WATCHED_CRYPTO_NAME,
          [BotTransitions.GET_BTC_INFO]: BotStates.FETCH_BTC_INFO,
        },
      },
      [BotStates.ACCEPT_CRYPTO_CHART_NAME]: {
        on: {
          [BotTransitions.GET_SELECTED_CRYPTO_CHART]: BotStates.FETCH_SELECTED_CRYPTO_CHART,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.FETCH_SELECTED_CRYPTO_CHART]: {
        on: {
          [BotTransitions.GET_SELECTED_CRYPTO_CHART]: BotStates.FETCH_SELECTED_CRYPTO_CHART,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        },
      },
      [BotStates.ACCEPT_WATCHED_CRYPTO_NAME]: {
        on: {
          [BotTransitions.ACCEPTED_WATCH_CRYPTO_BY_NAME]: BotStates.SETUP_WATCHED_CRYPTO,
          [BotTransitions.BACK_TO_START]: BotStates.INITIAL,
        }
      },
      [BotStates.SETUP_WATCHED_CRYPTO]: {
        on: {
          [BotTransitions.WATCH_CRYPTO_BY_NAME]: BotStates.SETUP_WATCHED_CRYPTO,
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
          [BotTransitions.GET_BTC_INFO]: BotStates.FETCH_BTC_INFO,
        },
      },
    },
  });

  return interpret(machine);
}
