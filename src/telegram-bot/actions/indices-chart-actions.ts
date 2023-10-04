import TelegramBot from 'node-telegram-bot-api';
import { DynamicConfig } from '../../dynamic-config';
import { CapitalComClient } from '../../exchange/capital-com-client';
import { ChartCanvasRenderer } from '../../exchange/chart-canvas-renderer';
import { EnvConfig } from '../../env-config';
import { GeneralTimeIntervals } from '../../enums';
import { TechIndicatorService } from '../../indicators/tech-indicator-service';
import { Logger } from 'winston';
import { BotLogger } from '../../utils/bot-logger';
import { getLinkText } from '../../get-link-text.helper';
import { Exchange } from '../../interfaces/user-state.interface';

export class IndicesChartAction {
  private logger: Logger | undefined;

  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private capitalComClient: CapitalComClient,
    private bot: TelegramBot
  ) {
    this.logger = BotLogger.getInstance(envConfig);
  }

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

        const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
          chartData: marketData,
          inputs: {
            isEODShown: true,
          },
        });

        const img = chartCanvasRenderer.generateImage(marketData, data || {});
        await this.bot.sendPhoto(chatId, img, {
          caption: getLinkText(asset, GeneralTimeIntervals.h1, Exchange.capitalcom),
          parse_mode: 'MarkdownV2',
        });
      }
    } catch (e) {
      throw new Error(`Error during chart indices chart generation: ${e}`);
    }
  }
}
