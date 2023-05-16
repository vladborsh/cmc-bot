import TelegramBot from 'node-telegram-bot-api';
import { StateMachine } from '@xstate/fsm';
import { EnvConfig } from '../env-config';
import { DynamicConfig } from '../dynamic-config';
import { TelegramBotActions } from './telegram-bot-actions';
import { createBotState } from './state-machine';
import { BotStates, BotTransitions } from '../enums';
import { stateActions } from './state-to-action-map';
import { botMessageTextToState } from './bot-configs';
import { TechIndicatorService } from '../indicators/tech-indicator-service';
import { DynamoDBClient } from '../db/dynamo-db-client';
import { AssetWatchListProcessor } from '../exchange/asset-watch-list-processor';
import { BinanceClient } from '../exchange/binance-client';

interface BotState {
  botActions: TelegramBotActions;
  stateMachine: StateMachine.Service<any, any>;
}

const botStates: Record<string, BotState> = {};

async function getBotState(
  envConfig: EnvConfig,
  bot: TelegramBot,
  assetWatchList: AssetWatchListProcessor,
  chatId: string
): Promise<BotState> {
  const dynamicValues = await DynamicConfig.getInstance(envConfig).getConfig();
  const dynamoDbClient = DynamoDBClient.getInstance(envConfig);
  const savedState = await dynamoDbClient.getUserState(chatId);
  const stateMachine = createBotState(savedState?.dialogState);

  const botActions = new TelegramBotActions(
    bot,
    envConfig,
    assetWatchList,
    dynamoDbClient,
    dynamicValues,
    savedState?.lastSelectedCrypto
  );
  stateMachine.start();

  return { stateMachine, botActions };
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
  const bot = new TelegramBot(envConfig.TG_TOKEN, { polling: true });
  await techIndicatorServiceHealthCheck(envConfig);
  const assetWatchList = AssetWatchListProcessor.getInstance(
    dynamoDbClient,
    TechIndicatorService.getInstance(envConfig),
    BinanceClient.getInstance(envConfig),
    bot
  );

  await assetWatchList.init();

  bot.on('message', async (message: TelegramBot.Message) => {
    console.log(`[${message.date}] ${message.text}`);

    if (!message.text) {
      return;
    }

    if (!botStates[message.chat.id]) {
      botStates[message.chat.id] = await getBotState(envConfig, bot, assetWatchList, message.chat.id.toString());
    }

    if (message.text === '/start') {
      await dynamoDbClient.saveUserState({
        chatId: message.chat.id.toString(),
        dialogState: BotStates.INITIAL,
        watchList: [],
      });

      stateActions[BotStates.INITIAL](
        botStates[message.chat.id].botActions,
        message,
        botStates[message.chat.id].stateMachine
      );
      return;
    }

    try {
      let transition: BotTransitions | undefined = botMessageTextToState[message.text];

      /* FIXME: some command/states accepts user input (FETCH_SELECTED_CRYPTO_CHART) */
      if (
        !transition &&
        ![BotStates.FETCH_SELECTED_CRYPTO_CHART, BotStates.SETUP_WATCHED_CRYPTO].includes(
          botStates[message.chat.id].stateMachine.state.value
        )
      ) {
        await bot.sendMessage(
          message.chat.id,
          `Unknown command for me`,
          TelegramBotActions.defaultReplyMarkup
        );

        transition = BotTransitions.BACK_TO_START;
      }

      /* FIXME: some command accepts user input */
      if (
        ![BotStates.FETCH_SELECTED_CRYPTO_CHART, BotStates.SETUP_WATCHED_CRYPTO].includes(
          botStates[message.chat.id].stateMachine.state.value
        )
      ) {
        botStates[message.chat.id].stateMachine.send(transition);
      }

      let newState: BotStates;

      do {
        newState = botStates[message.chat.id].stateMachine.state.value;

        await dynamoDbClient.updateDialogState(message.chat.id.toString(), newState);

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
