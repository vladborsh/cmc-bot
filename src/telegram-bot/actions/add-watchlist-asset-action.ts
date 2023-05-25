import TelegramBot from 'node-telegram-bot-api';
import { validateChartForSelectedCryptoCommand } from '../action-helpers';
import { EnvConfig } from '../../env-config';
import { DynamicConfig } from '../../dynamic-config';
import { DynamoDBClient } from '../../db/dynamo-db-client';
import { GeneralTimeIntervals } from '../../enums';
import { Exchange } from '../../interfaces/user-state.interface';
import { AssetWatchListProcessor } from '../../exchange/asset-watch-list-processor';

export class AddAssetToWatchlistAction {
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
      await this.dynamoDbClient.addItemToWatchList(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: (exchange as Exchange) ?? Exchange.binance,
      });

      this.assetWatchListProcessor.addWatchListItem(command.chat.id, {
        name: asset.toUpperCase(),
        timeFrame: timeFrame as GeneralTimeIntervals,
        exchange: (exchange as Exchange) ?? Exchange.binance,
      });

      const watchListMessage = await this.getWatchListMessage(command.chat.id);

      this.bot.sendMessage(
        command.chat.id,
        `Everything is OK: ${asset} ${timeFrame} added to watch list \n\n${watchListMessage}`
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
