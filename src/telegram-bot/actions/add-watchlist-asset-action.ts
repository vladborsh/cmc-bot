import TelegramBot from 'node-telegram-bot-api';
import { validateChartForSelectedCryptoCommand } from '../action-helpers';
import { EnvConfig } from '../../env-config';
import { DynamicConfig } from '../../dynamic-config';
import { DynamoDBClient } from '../../db/dynamo-db-client';
import { GeneralTimeIntervals } from '../../enums';
import { Exchange } from '../../interfaces/user-state.interface';
import { AssetWatchListProcessor } from '../../exchange/asset-watch-list-processor';
import { ParsedAssetInfo } from '../../interfaces/parsed-asset-info.interface';

export class AddAssetToWatchlistAction {
  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private bot: TelegramBot,
    private dynamoDbClient: DynamoDBClient,
    private assetWatchListProcessor: AssetWatchListProcessor
  ) {}

  public async execute(command: TelegramBot.Message) {
    let assetInfo: ParsedAssetInfo;
    if (!command.text) {
      throw new Error(`invalid command: "${command.text}"`);
    }
    try {
      assetInfo = await validateChartForSelectedCryptoCommand(command.text?.trim(), this.envConfig);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }

    try {
      await this.dynamoDbClient.addItemToWatchList(command.chat.id, {
        name: assetInfo.asset.toUpperCase(),
        timeFrame: assetInfo.timeFrame,
        exchange: assetInfo.exchange ?? Exchange.binance,
      });

      this.assetWatchListProcessor.addWatchListItem(command.chat.id, {
        name: assetInfo.asset.toUpperCase(),
        timeFrame: assetInfo.timeFrame,
        exchange: assetInfo.exchange ?? Exchange.binance,
      });

      const watchListMessage = await this.getWatchListMessage(command.chat.id);

      this.bot.sendMessage(
        command.chat.id,
        `Everything is OK: ${assetInfo.asset} ${assetInfo.timeFrame} added to watch list \n\n${watchListMessage}`
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
