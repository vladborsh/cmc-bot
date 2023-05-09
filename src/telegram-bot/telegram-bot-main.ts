import TelegramBot from 'node-telegram-bot-api';
import { StateMachine } from '@xstate/fsm';
import { EnvConfig } from '../env-config';
import { DynamicConfig } from '../dynamic-config';
import { TelegramBotActions } from './telegram-bot-actions';
import { createBotState } from './state-machine';
import { BotStates, BotTransitions } from '../enums';
import { stateActions } from './state-to-action-map';
import { botMessageTextToState } from './bot-configs';

interface BotState {
  botActions: TelegramBotActions;
  stateMachine: StateMachine.Service<any, any>;
}

const botStates: Record<string, BotState> = {};

async function getBotState(
  envConfig: EnvConfig,
  bot: TelegramBot
): Promise<BotState> {
  const dynamicValues = await DynamicConfig.getInstance(envConfig).getConfig();
  const stateMachine = createBotState();
  const botActions = new TelegramBotActions(bot, envConfig, dynamicValues);
  stateMachine.start();

  return { stateMachine, botActions };
}

export function runTelegramBot(envConfig: EnvConfig, dynamicConfig: DynamicConfig) {
  if (!envConfig.TG_TOKEN) {
    console.error('TG token was not provided');
    return;
  }

  const bot = new TelegramBot(envConfig.TG_TOKEN, { polling: true });

  bot.on('message', async (message: TelegramBot.Message) => {
    console.log(`[${message.date}] ${message.text}`);

    if (!message.text) {
      return;
    }

    if (!botStates[message.chat.id]) {
      botStates[message.chat.id] = await getBotState(envConfig, bot);
    }

    if (message.text === '/start') {
      stateActions[BotStates.INITIAL](
        botStates[message.chat.id].botActions,
        message,
        botStates[message.chat.id].stateMachine
      );
      return;
    }

    try {
      let transition: BotTransitions | undefined = botMessageTextToState[message.text];

      if (!transition) {
        await bot.sendMessage(
          message.chat.id,
          `Unknown command for me`,
          TelegramBotActions.defaultReplyMarkup
        );

        transition = BotTransitions.BACK_TO_START;
      }

      botStates[message.chat.id].stateMachine.send(transition);

      let newState: BotStates;

      do {
        newState = botStates[message.chat.id].stateMachine.state.value;

        await stateActions[newState](
          botStates[message.chat.id].botActions,
          message,
          botStates[message.chat.id].stateMachine
        );
      } while (newState !== botStates[message.chat.id].stateMachine.state.value);
    } catch (error) {
      console.error('Error while handling coin data command:', error);
      if (botStates[message.chat.id]) {
        botStates[message.chat.id].stateMachine.send(BotTransitions.BACK_TO_START);
      }
      bot.sendMessage(
        message.chat.id,
        `I'm sorry, something happens during processing...`,
        TelegramBotActions.defaultReplyMarkup
      );
    }
  });
}
