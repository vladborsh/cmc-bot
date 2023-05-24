import TelegramBot from 'node-telegram-bot-api';
import { DynamicConfig } from '../../dynamic-config';
import { CryptopanicNewsMapper } from '../../cryptopanic-news-mapper';
import { DynamoDBClient } from '../../db/dynamo-db-client';
import { Requests } from '../../requests';

export class SelectNewsAction {
  constructor(
    private dynamicConfig: DynamicConfig,
    private bot: TelegramBot,
    private dynamoDbClient: DynamoDBClient,
    private requests: Requests
  ) {}

  public async execute(chatId: TelegramBot.ChatId) {
    const savedState = await this.dynamoDbClient.getUserState(chatId);

    if (!savedState?.lastSelectedCrypto) {
      await this.bot.sendMessage(
        chatId,
        `Sorry, there is no selected currency, please try again`,
      );
      return;
    }

    const newsByAsset = await this.requests.getNews(savedState?.lastSelectedCrypto);

    if (!Object.keys(newsByAsset).length) {
      this.bot.sendMessage(
        chatId,
        `There is not important news 🤷‍♂️`,
      );
      return;
    }

    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const cryptopanicNewsMapper = new CryptopanicNewsMapper(dynamicConfigValues);

    try {
      const coinNewsMessage = cryptopanicNewsMapper.processDayTradingNews(newsByAsset);

      this.bot.sendMessage(chatId, coinNewsMessage, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      });
    } catch (e) {
      await this.bot.sendMessage(
        chatId,
        `Can't retrieve news at the moment 🤷‍♂️`,
      );
    }
  }
}
