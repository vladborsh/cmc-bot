import TelegramBot from "node-telegram-bot-api";
import { DynamicConfig } from "../../dynamic-config";
import { CapitalComClient } from "../../exchange/capital-com-client";
import { ChartCanvasRenderer } from "../../exchange/chart-canvas-renderer";
import { EnvConfig } from "../../env-config";
import { GeneralTimeIntervals } from "../../enums";
import { TechIndicatorService } from "../../indicators/tech-indicator-service";

export class IndicesChartAction {
  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private capitalComClient: CapitalComClient,
    private bot: TelegramBot,
  ) {}

  public async execute(chatId: TelegramBot.ChatId) {
    const dynamicConfigValues = await this.dynamicConfig.getConfig();

    try {
      for (let asset of ['US500', 'DXY']) {
        const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);
        const marketData = await this.capitalComClient.getCandles(
          asset,
          GeneralTimeIntervals.h1,
          dynamicConfigValues.CHART_HISTORY_SIZE
        );

        const { data } = await TechIndicatorService.getInstance(
          this.envConfig
        ).getSMIndicator({
          chartData: marketData,
          inputs: {
            isMidnightShown: true,
          }
        });
        const img = chartCanvasRenderer.generateImage(marketData, data || {});
        await this.bot.sendPhoto(chatId, img, { caption: `${asset} price chart` });
      }
    } catch (e) {
      console.error(`error during chart indices chart generation`, e);
      await this.bot.sendMessage(chatId, `Somethings goes wrong with indices request`);
    }
  }
}
