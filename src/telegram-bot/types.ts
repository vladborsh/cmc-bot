import TelegramBot from "node-telegram-bot-api";
import { StateMachine } from '@xstate/fsm';

export type BotStateHandler = (
  bot: TelegramBot,
  message: TelegramBot.Message,
  state: StateMachine.Service<any, any>
) => Promise<void>;
