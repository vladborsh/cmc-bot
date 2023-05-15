import TelegramBot from 'node-telegram-bot-api';
import { StateMachine } from '@xstate/fsm';
import { BotStates, BotTransitions } from '../enums';
import { TelegramBotActions } from './telegram-bot-actions';
import { BotStateHandler } from './types';

export const stateActions: Record<BotStates, BotStateHandler> = {
  [BotStates.INITIAL]: async (actions: TelegramBotActions, message: TelegramBot.Message) => {
    actions.sendInitialMessage(message.chat.id);
  },
  [BotStates.CRYPTO_CURRENCY_SORT]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message
  ) => {
    actions.sendCryptoSortingMessage(message.chat.id);
  },
  [BotStates.ACCEPT_CRYPTO_CHART_NAME]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    await actions.acceptChartForSelectedCrypto(message.chat.id.toString());
    state.send(BotTransitions.GET_SELECTED_CRYPTO_CHART);
  },
  [BotStates.FETCH_SELECTED_CRYPTO_CHART]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    /* FIXME: shim for ignoring previous chat input */
    if (message.text?.includes('Select')) {
      return;
    }
    try {
      await actions.fetchChartForSelectedCrypto(message.chat.id, message);
    } catch (e) {
      state.send(BotTransitions.GET_SELECTED_CRYPTO_CHART);
      return;
    }
    state.send(BotTransitions.BACK_TO_START);
  },
  [BotStates.FETCH_CRYPTO_CURRENCY]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message
  ) => {
    await actions.selectCrypto(message.chat.id, message);
  },
  [BotStates.CRYPTO_CURRENCY_CHARTS]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    await actions.renderCryptoCharts(message.chat.id);
    state.send(BotTransitions.GO_TO_CRYPTO_NEWS);
  },
  [BotStates.LATEST_NEWS]: async (actions: TelegramBotActions, message: TelegramBot.Message) => {
    actions.askAboutNews(message.chat.id);
  },
  [BotStates.FETCH_LATEST_NEWS]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    await actions.selectNews(message.chat.id);
    state.send(BotTransitions.NEWS_SELECTED);
  },
  [BotStates.FETCH_INDICES]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    await actions.renderIndicesCharts(message.chat.id);
    state.send(BotTransitions.INDICES_SELECTED);
  },
  [BotStates.FETCH_BTC_INFO]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message,
  ) => {
    await actions.getBTCChart(message.chat.id);
  },
};
