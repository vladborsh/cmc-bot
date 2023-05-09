import TelegramBot from "node-telegram-bot-api";
import { TelegramBotActions } from "./telegram-bot-actions";
import { StateMachine } from '@xstate/fsm';

export type BotStateHandler = (
  actions: TelegramBotActions,
  message: TelegramBot.Message,
  state: StateMachine.Service<any, any>
) => Promise<void>;
