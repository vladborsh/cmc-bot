import TelegramBot from "node-telegram-bot-api";

export class AcceptAssetNameRemoveWatchlistAction {
  constructor(
    private bot: TelegramBot
  ) {}

  public async execute(chatId: TelegramBot.ChatId): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `What asset do you want to remove from watch list? Please type space\\-separated text with asset name, timeframe \\(m5, m15, h1, h4\\) and optionally exchange, like \`btcusdt m5\` or \`gbpusd m15 capitalcom\` or \`gu m15\`\\(gbpusd pair\\)\\. Just type \`stop\` if you would like back to menu`,
      {
        parse_mode: 'MarkdownV2',
      }
    );
  }
}
