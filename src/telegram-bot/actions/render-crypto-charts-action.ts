import TelegramBot from "node-telegram-bot-api";
import { DynamicConfig } from "../../dynamic-config";
import { EnvConfig } from "../../env-config";
import { DynamoDBClient } from "../../db/dynamo-db-client";
import { BinanceClient } from "../../exchange/binance-client";
import { ChartCanvasRenderer } from "../../exchange/chart-canvas-renderer";
import { GeneralTimeIntervals } from "../../enums";
import { TechIndicatorService } from "../../indicators/tech-indicator-service";

export class RenderCryptoChartsAction {
  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private bot: TelegramBot,
    private dynamoDbClient: DynamoDBClient,
  ) {}

  public async execute(chatId: number) {
    const savedState = await this.dynamoDbClient.getUserState(chatId);

    if (!savedState?.lastSelectedCrypto) {
      await this.bot.sendMessage(chatId, `Sorry, there is no selected currency, please try again`);
      return;
    }

    const binanceClient = await BinanceClient.getInstance(this.envConfig);

    let count = 0;
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);

    for (let symbol of savedState.lastSelectedCrypto.map((symbol) => `${symbol}USDT`)) {
      try {
        if (!(await binanceClient.isSymbolExists(symbol))) {
          continue;
        }
      } catch (e) {
        console.error(e);
        break;
      }

      try {
        const candles = await binanceClient.getCandles(
          symbol,
          GeneralTimeIntervals.h1,
          dynamicConfigValues.CHART_HISTORY_SIZE
        );
        const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
          chartData: candles,
        });
        const img = chartCanvasRenderer.generateImage(candles, data || {});
        await this.bot.sendPhoto(chatId, img, { caption: `${symbol} price chart` });
        count++;
      } catch (e) {
        console.error(`error during chart image generation: ${symbol}`);
        console.log(e);
      }
    }

    if (count === 0) {
      await this.bot.sendMessage(chatId, `Looks like those currency are not present on Binance`);
    }
  }
}
