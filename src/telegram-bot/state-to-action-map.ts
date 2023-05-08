import TelegramBot from "node-telegram-bot-api";
import { StateMachine } from '@xstate/fsm';
import { BotStates, BotTransitions } from "../enums";
import { TelegramBotActions } from "./telegram-bot-helpers";
import { BotStateHandler } from "./types";

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
  [BotStates.FETCH_CRYPTO_CURRENCY]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message
  ) => {
    await actions.selectCrypto(message.chat.id, message);
  },
  [BotStates.CRYPTO_CURRENCY_CHARTS]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message
  ) => {
    await actions.renderCryptoCharts(message.chat.id);
  },
  [BotStates.LATEST_NEWS]: async (actions: TelegramBotActions, message: TelegramBot.Message) => {
    actions.askAboutNews(message.chat.id);
  },
  [BotStates.FETCH_LATEST_NEWS]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message
  ) => {
    await actions.selectNews(message.chat.id);
  },
  [BotStates.FETCH_INDICES]: async (
    actions: TelegramBotActions,
    message: TelegramBot.Message,
    state: StateMachine.Service<any, any>
  ) => {
    await actions.renderIndicesCharts(message.chat.id);
    state.send(BotTransitions.INDICES_SELECTED);
  },
};