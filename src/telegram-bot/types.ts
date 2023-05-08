import TelegramBot from "node-telegram-bot-api";
import { TelegramBotActions } from "./telegram-bot-helpers";
import { StateMachine } from '@xstate/fsm';

export type BotStateHandler = (
  actions: TelegramBotActions,
  message: TelegramBot.Message,
  state: StateMachine.Service<any, any>
) => void;
