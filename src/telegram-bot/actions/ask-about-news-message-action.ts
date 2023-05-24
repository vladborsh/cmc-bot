import TelegramBot from "node-telegram-bot-api";
import { BotCommands } from "../../enums";

export class AskAboutNewsMessageAction {
  constructor(
    private bot: TelegramBot,
  ) {}

  public execute(chatId: TelegramBot.ChatId) {
    this.bot.sendMessage(chatId, `Do you want to see related to these currencies news?`, {
      reply_markup: {
        keyboard: [[{ text: BotCommands.yesShowNews }, { text: BotCommands.noDoNotShowNews }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
}
