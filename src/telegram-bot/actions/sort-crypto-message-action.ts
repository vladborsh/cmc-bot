import TelegramBot from "node-telegram-bot-api";
import { BotCommands } from "../../enums";

export class SortCryptoMessageAction {
  constructor(
    private bot: TelegramBot,
  ) {}

  public async execute(chatId: TelegramBot.ChatId) {
    await this.bot.sendMessage(chatId, `What sorting do you prefer?`, {
      reply_markup: {
        keyboard: [
          [
            { text: BotCommands.volume24h },
            { text: BotCommands.price7d },
            { text: BotCommands.price24h },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
}
