import TelegramBot from 'node-telegram-bot-api';
import { DynamicConfig } from '../../dynamic-config';
import { EnvConfig } from '../../env-config';
import { DynamoDBClient } from '../../db/dynamo-db-client';
import { AssetWatchListProcessor } from '../../exchange/asset-watch-list-processor';
import { validateChartForSelectedCryptoCommand } from '../action-helpers';
import { WatchListItemExchange } from '../../interfaces/user-state.interface';
import { GeneralTimeIntervals } from '../../enums';

export class RemoveWatchlistAssetAction {
  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private bot: TelegramBot,
    private dynamoDbClient: DynamoDBClient,
    private assetWatchListProcessor: AssetWatchListProcessor
  ) {}

  public async execute(command: TelegramBot.Message) {
    if (!command.text) {
      throw new Error(`invalid command: "${command.text}"`);
    }
    try {
      await validateChartForSelectedCryptoCommand(command.text?.trim(), this.envConfig);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
    const [asset, timeFrame, exchange] = command.text.trim().split(' ');

    try {
      await this.dynamoDbClient.removeItemFromWatchList(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: (exchange as WatchListItemExchange) ?? WatchListItemExchange.binance,
      });

      this.assetWatchListProcessor.removeWatchListItem(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: (exchange as WatchListItemExchange) ?? WatchListItemExchange.binance,
      });

      const watchListMessage = await this.getWatchListMessage(command.chat.id);

      this.bot.sendMessage(
        command.chat.id,
        `Everything is OK: ${asset} ${timeFrame} removed from watch list \n\n${watchListMessage}`
      );
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }
  }

  private async getWatchListMessage(chatId: TelegramBot.ChatId): Promise<string> {
    const userState = await this.dynamoDbClient.getUserState(chatId);

    const messageStr = userState?.watchList?.reduce(
      (message, item) => `${message}- ${item.name} ${item.timeFrame}\n`,
      ''
    );

    return messageStr ? `Watch list:\n${messageStr}` : `You don't have watched crypto`;
  }
}
