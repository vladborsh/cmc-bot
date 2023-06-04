import TelegramBot from 'node-telegram-bot-api';
import { validateAssetName } from '../validate-asset-name';
import { EnvConfig } from '../../env-config';
import { DynamicConfig } from '../../dynamic-config';
import { BinanceClient } from '../../exchange/binance-client';
import { ChartCanvasRenderer } from '../../exchange/chart-canvas-renderer';
import { GeneralTimeIntervals } from '../../enums';
import { TechIndicatorService } from '../../indicators/tech-indicator-service';
import { getLinkText } from '../../ge-link-text.helper';
import { CapitalComClient } from '../../exchange/capital-com-client';
import { Exchange } from '../../interfaces/user-state.interface';
import { IExchangeClient } from '../../interfaces/exchange-client.interface';
import { ParsedAssetInfo } from '../../interfaces/parsed-asset-info.interface';

export class FetchAssetChartAction {
  stringToExchange: Record<Exchange, IExchangeClient> = {
    [Exchange.binance]: this.binanceClient,
    [Exchange.capitalcom]: this.capitalComClient,
  };

  constructor(
    private envConfig: EnvConfig,
    private dynamicConfig: DynamicConfig,
    private binanceClient: BinanceClient,
    private capitalComClient: CapitalComClient,
    private bot: TelegramBot
  ) {}

  public async execute(command: TelegramBot.Message): Promise<void> {
    let assetInfo: ParsedAssetInfo;
    if (!command.text) {
      throw new Error(`invalid command: "${command.text}"`);
    }
    try {
      assetInfo = await validateAssetName(command.text.trim(), this.envConfig);
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
      throw new Error(`error: "${e?.toString()}"`);
    }

    const dynamicConfigValues = await this.dynamicConfig.getConfig();
    const chartCanvasRenderer = new ChartCanvasRenderer(dynamicConfigValues);

    const exchangeClient = this.stringToExchange[assetInfo.exchange] || this.binanceClient;

    try {
      const candles = await exchangeClient.getCandles(
        assetInfo.asset.toUpperCase(),
        assetInfo.timeFrame,
        dynamicConfigValues.CHART_HISTORY_SIZE
      );
      const { data } = await TechIndicatorService.getInstance(this.envConfig).getSMIndicator({
        chartData: candles,
        inputs: {
          isEODShown: true,
          sessions: [
            {
              hourStart: 9,
              hourEnd: 20,
            },
          ],
        },
      });
      const img = chartCanvasRenderer.generateImage(candles, data || {});
      await this.bot.sendPhoto(command.chat.id, img, {
        caption: getLinkText(assetInfo.asset, assetInfo.timeFrame, assetInfo.exchange),
        parse_mode: 'MarkdownV2',
      });
    } catch (e) {
      this.bot.sendMessage(command.chat.id, `Error: ${e?.toString()}`);
    }
  }
}
