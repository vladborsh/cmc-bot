import TelegramBot from "node-telegram-bot-api";
import { BotCommands } from "../../enums";

export class WatchlistMenuAction {
  constructor(
    private bot: TelegramBot
  ) {}

  public async execute(chatId: TelegramBot.ChatId): Promise<void> {
    await this.bot.sendMessage(chatId, `What we gonna do with watch list?`, {
      reply_markup: {
        keyboard: [
          [{ text: BotCommands.addToWatchlist }, { text: BotCommands.removeFromWatchlist }],
          [{ text: BotCommands.viewWatchlist }, { text: BotCommands.back }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
}
