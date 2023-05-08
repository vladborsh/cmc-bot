import { createMachine, interpret, StateMachine } from '@xstate/fsm';
import { BotStates, BotTransitions } from '../enums';

export function createBotState(): StateMachine.Service<any, any> {
  const machine = createMachine({
    initial: BotStates.INITIAL,
    states: {
      [BotStates.INITIAL]: {
        on: {
          [BotTransitions.GET_TOP_CRYPTO]: BotStates.CRYPTO_CURRENCY_SORT,
          [BotTransitions.GET_INDICES]: BotStates.FETCH_INDICES,
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
    },
  });

  return interpret(machine);
}
