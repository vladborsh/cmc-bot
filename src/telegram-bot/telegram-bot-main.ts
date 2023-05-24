import TelegramBot from 'node-telegram-bot-api';
import { StateMachine } from '@xstate/fsm';
import { EnvConfig } from '../env-config';
import { DynamicConfig } from '../dynamic-config';
import { createBotState } from './state-machine';
import { BotStates, BotTransitions } from '../enums';
import { stateActions } from './state-to-action-map';
import { botMessageTextToState } from './bot-message-text-to-state.config';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import { DynamoDBClient } from '../db/dynamo-db-client';
import { AssetWatchListProcessor } from '../exchange/asset-watch-list-processor';
import { BinanceClient } from '../exchange/binance-client';
import { botPromptStates } from './bot-prompt-states.config';
import { CapitalComClient } from '../exchange/capital-com-client';


const botStates: Record<string, StateMachine.Service<any, any>> = {};

async function getBotState(
  chatId: TelegramBot.ChatId,
): Promise<StateMachine.Service<any, any>> {
  const dynamoDbClient = DynamoDBClient.getInstance(EnvConfig.getInstance());
  const savedState = await dynamoDbClient.getUserState(chatId);
  const stateMachine = createBotState(savedState?.dialogState);

  stateMachine.start();

  return stateMachine;
}

async function techIndicatorServiceHealthCheck(envConfig: EnvConfig) {
  const techIndicator = TechIndicatorService.getInstance(envConfig);
  const healthy = await techIndicator.health();

  console.info(`[INFO] tech-indicator-service health: ${healthy}`);

  return healthy;
}

export async function runTelegramBot(envConfig: EnvConfig) {
  if (!envConfig.TG_TOKEN) {
    console.error('TG token was not provided');
    return;
  }
  const dynamoDbClient = DynamoDBClient.getInstance(envConfig);
  const dynamicConfig = DynamicConfig.getInstance(envConfig);
  const bot = new TelegramBot(envConfig.TG_TOKEN, { polling: true });
  await techIndicatorServiceHealthCheck(envConfig);
  const binanceClient = BinanceClient.getInstance(envConfig);
  const capitalComClient = CapitalComClient.getInstance(envConfig);
  const assetWatchList = AssetWatchListProcessor.getInstance(
    dynamoDbClient,
    TechIndicatorService.getInstance(envConfig),
    BinanceClient.getInstance(envConfig),
    CapitalComClient.getInstance(envConfig),
    dynamicConfig,
    bot
  );
  await capitalComClient.init();
  await binanceClient.init();
  await assetWatchList.init();

  bot.on('message', async (message: TelegramBot.Message) => {
    console.log(`[${message.date}] ${message.text}`);

    if (!message.text) {
      return;
    }

    if (!botStates[message.chat.id]) {
      botStates[message.chat.id] = await getBotState(
        message.chat.id
      );
    }

    if (message.text === '/start') {
      await dynamoDbClient.updateDialogState(
        message.chat.id.toString(),
        BotStates.INITIAL,
      );

      botStates[message.chat.id].send(BotTransitions.BACK_TO_START);

      stateActions[BotStates.INITIAL](
        bot,
        message,
        botStates[message.chat.id]
      );
      return;
    }

    try {
      let transition: BotTransitions | undefined = botMessageTextToState[message.text];

      if (
        !transition &&
        !botPromptStates.includes(botStates[message.chat.id].state.value)
      ) {
        await bot.sendMessage(
          message.chat.id,
          `Unknown command for me`,
        );

        transition = BotTransitions.BACK_TO_START;
      }

      if (!botPromptStates.includes(botStates[message.chat.id].state.value)) {
        botStates[message.chat.id].send(transition);
      }

      let newState: BotStates;

      do {
        newState = botStates[message.chat.id].state.value;

        await dynamoDbClient.updateDialogState(message.chat.id.toString(), newState);

        await stateActions[newState](
          bot,
          message,
          botStates[message.chat.id]
        );
      } while (newState !== botStates[message.chat.id].state.value);
    } catch (error) {
      console.error('Error while handling command:', error);

      await bot.sendMessage(
        message.chat.id,
        `I'm sorry, something happens during processing...`,
      );

      if (botStates[message.chat.id]) {
        botStates[message.chat.id].send(BotTransitions.BACK_TO_START);
      }
    }
  });
}
