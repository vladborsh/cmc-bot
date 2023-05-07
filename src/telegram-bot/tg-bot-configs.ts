import { BotCommands } from "../enums";

export const replyMarkup = {
  keyboard: [
    [
      { text: BotCommands.price24h },
      { text: BotCommands.price7d },
      { text: BotCommands.volume24h },
    ],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};
