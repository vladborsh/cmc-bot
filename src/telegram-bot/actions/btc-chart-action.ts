import TelegramBot from 'node-telegram-bot-api';
import { BinanceClient } from '../../exchange/binance-client';
import { DynamicConfig } from '../../dynamic-config';
import { EnvConfig } from '../../env-config';
import { GeneralTimeIntervals } from '../../enums';
import { ChartCanvasRenderer } from '../../exchange/chart-canvas-renderer';
import { TechIndicatorService } from '../../indicators/tech-indicator-service';

export class BtcChartAction {
  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private binanceClient: BinanceClient,
    private bot: TelegramBot
  ) {}

  public async execute(chatId: TelegramBot.ChatId) {
    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);
    const candles = await this.binanceClient.getCandles(
      'BTCUSDT',
      GeneralTimeIntervals.h1,
      dynamicConfigValues.CHART_HISTORY_SIZE
    );
    const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
      chartData: candles,
      inputs: {
        sessions: [
          {
            hourStart: 9,
            hourEnd: 20,
          },
        ],
      },
    });
    const img = chartCanvasRenderer.generateImage(candles, data || {});
    await this.bot.sendPhoto(chatId, img, { caption: `BTC price chart` });
  }
}
