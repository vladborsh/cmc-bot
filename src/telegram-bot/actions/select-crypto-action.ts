import TelegramBot from "node-telegram-bot-api";
import { DynamicConfig } from "../../dynamic-config";
import { EnvConfig } from "../../env-config";
import { Requests } from "../../requests";
import { DynamoDBClient } from "../../db/dynamo-db-client";
import { MarketDataMapper } from "../../market-data-mapper";
import { processDayTradingSelectionForMessage } from "../../formatting";
import { BotCommands } from "../../enums";

export class SelectCryptoAction {
  constructor(
    private dynamicConfig: DynamicConfig,
    private bot: TelegramBot,
    private dynamoDbClient: DynamoDBClient,
    private requests: Requests,
  ) {}

  public async execute(command: TelegramBot.Message) {
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const marketDataMapper = new MarketDataMapper(dynamicConfigValues);
    const marketData = await this.requests.selectDayTradingFromMarket();
    const selection = marketDataMapper.filterAndSortCoins(marketData, command.text as BotCommands);
    const newSelection = selection.map((listing) => listing.symbol);

    await this.dynamoDbClient.updateLastSelectedCrypto(
      command.chat.id,
      newSelection,
    );
    await this.bot.sendMessage(command.chat.id, processDayTradingSelectionForMessage(selection), {
      parse_mode: 'MarkdownV2',
    });
    await this.bot.sendMessage(command.chat.id, `Shall I draw those charts?`, {
      reply_markup: {
        keyboard: [[{ text: BotCommands.yesDrawCharts }, { text: BotCommands.noDoNotDraw }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
}
