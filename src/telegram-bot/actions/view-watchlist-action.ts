import TelegramBot from "node-telegram-bot-api";
import { DynamoDBClient } from "../../db/dynamo-db-client";

export class ViewWatchlistAction {
  constructor(
    private dynamoDBClient: DynamoDBClient,
    private bot: TelegramBot
  ) {}

  public async execute(chatId: TelegramBot.ChatId): Promise<void> {
    const userState = await this.dynamoDBClient.getUserState(chatId);

    const messageStr = userState?.watchList?.reduce(
      (message, item) => `${message}- ${item.name} ${item.timeFrame}\n`,
      ''
    );

    const finalMessage = messageStr ? `Watch list:\n${messageStr}` : `You don't have watched crypto`;

    await this.bot.sendMessage(chatId, finalMessage);
  }
}
