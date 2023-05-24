import TelegramBot from "node-telegram-bot-api";
import { BotCommands } from "../../enums";

export class InitialMessageAction {
  constructor(
    private bot: TelegramBot,
  ) {}

  public async execute(chatId: TelegramBot.ChatId) {
    await this.bot.sendMessage(
      chatId,
      `What we gonna do now? I can show you top Crypto currency selection for intraday trading or show important Indices info`,
      {
        reply_markup: {
          keyboard: [
            [{ text: BotCommands.topCrypto }, { text: BotCommands.indices }],
            [{ text: BotCommands.getAssetChart }, { text: BotCommands.watchlist }],
            [{ text: BotCommands.btcInfo }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }
}
