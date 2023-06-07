import TelegramBot from 'node-telegram-bot-api';
import { StateMachine } from '@xstate/fsm';
import { EnvConfig } from '../env-config';
import { DynamicConfig } from '../dynamic-config';
import { createBotState } from './state-machine';
import { BotStates, BotTransitions, LogMessageType } from '../enums';
import { stateActions } from './state-to-action-map';
import { botMessageTextToState } from './bot-message-text-to-state.config';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import { DynamoDBClient } from '../db/dynamo-db-client';
import { AssetWatchListProcessor } from '../exchange/asset-watch-list-processor';
import { BinanceClient } from '../exchange/binance-client';
import { botPromptStates } from './bot-prompt-states.config';
import { CapitalComClient } from '../exchange/capital-com-client';
import { BotLogger } from '../utils/bot-logger';
import { WatchListLogger } from '../utils/watchlist-logger';
import { CapitalComWebsocket } from '../exchange/capital-com-websocket';
import { CapitalComSession } from '../exchange/capital-com-session';

const botStates: Record<string, StateMachine.Service<any, any>> = {};

async function getBotState(chatId: TelegramBot.ChatId): Promise<StateMachine.Service<any, any>> {
  const dynamoDbClient = DynamoDBClient.getInstance(EnvConfig.getInstance());
  const savedState = await dynamoDbClient.getUserState(chatId);
  const stateMachine = createBotState(savedState?.dialogState);

  stateMachine.start();

  return stateMachine;
}

async function techIndicatorServiceHealthCheck(envConfig: EnvConfig) {
  const techIndicator = TechIndicatorService.getInstance(envConfig);
  const healthy = await techIndicator.health();

  return healthy;
}

export async function runTelegramBot(envConfig: EnvConfig) {
  const logger = BotLogger.getInstance(envConfig);
  const watcherLogger = WatchListLogger.getInstance(envConfig);
  const dynamoDbClient = DynamoDBClient.getInstance(envConfig);
  const dynamicConfig = DynamicConfig.getInstance(envConfig);

  const bot = new TelegramBot(envConfig.TG_TOKEN || '', { polling: true });
  const binanceClient = BinanceClient.getInstance(envConfig);
  const capitalComSession = CapitalComSession.getInstance(envConfig);
  const capitalComWebsocket = CapitalComWebsocket.getInstance(
    envConfig,
    capitalComSession,
    watcherLogger
  );
  const capitalComClient = CapitalComClient.getInstance(
    envConfig,
    capitalComSession,
    capitalComWebsocket
  );
  const assetWatchList = AssetWatchListProcessor.getInstance(
    envConfig,
    dynamoDbClient,
    TechIndicatorService.getInstance(envConfig),
    BinanceClient.getInstance(envConfig),
    capitalComClient,
    dynamicConfig,
    bot
  );
  await capitalComClient.init();
  await binanceClient.init();
  await assetWatchList.init();

  try {
    await techIndicatorServiceHealthCheck(envConfig);
  } catch (e) {
    logger.error({ message: 'tech indicator health check fails' });
  }

  bot.on('message', async (message: TelegramBot.Message) => {
    logger.info({ chatId: message.chat.id, type: LogMessageType.COMMAND, message: message.text });

    if (!message.text) {
      return;
    }

    if (!botStates[message.chat.id]) {
      botStates[message.chat.id] = await getBotState(message.chat.id);
    }

    if (message.text === '/start') {
      await dynamoDbClient.updateDialogState(message.chat.id.toString(), BotStates.INITIAL);

      botStates[message.chat.id].send(BotTransitions.BACK_TO_START);

      stateActions[BotStates.INITIAL](bot, message, botStates[message.chat.id]);
      return;
    }

    try {
      let transition: BotTransitions | undefined = botMessageTextToState[message.text];

      if (!transition && !botPromptStates.includes(botStates[message.chat.id].state.value)) {
        await bot.sendMessage(message.chat.id, `Unknown command for me`);

        transition = BotTransitions.BACK_TO_START;
      }

      if (!botPromptStates.includes(botStates[message.chat.id].state.value)) {
        botStates[message.chat.id].send(transition);
      }

      let newState: BotStates;

      do {
        newState = botStates[message.chat.id].state.value;

        await dynamoDbClient.updateDialogState(message.chat.id.toString(), newState);

        await stateActions[newState](bot, message, botStates[message.chat.id]);
      } while (newState !== botStates[message.chat.id].state.value);
    } catch (error) {
      logger.error({ chatId: message.chat.id, message: `Error while handling command: ${error}`});

      await bot.sendMessage(message.chat.id, `I'm sorry, something happens during processing...`);

      if (botStates[message.chat.id]) {
        botStates[message.chat.id].send(BotTransitions.BACK_TO_START);
      }
    }
  });
}
