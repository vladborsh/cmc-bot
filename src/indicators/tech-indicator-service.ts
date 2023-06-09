import axios from 'axios';
import { EnvConfig } from '../env-config';
import { SmIndicatorRequest } from '../interfaces/indicator/sm-indicator-request';
import { SmIndicatorResponse } from '../interfaces/indicator/sm-indicator-response';

export class TechIndicatorService {
  defaultUrl = 'localhost:4000';
  private static instance: TechIndicatorService;

  private constructor(private envConfig: EnvConfig) {}

  public static getInstance(envConfig: EnvConfig): TechIndicatorService {
    if (!this.instance) {
      this.instance = new TechIndicatorService(envConfig);
    }
    return this.instance;
  }

  public async health(): Promise<boolean> {
    try {
      await axios.post(
        `${this.envConfig.TECH_INDICATOR_SERVICE_URL || this.defaultUrl}/v1/api`,
        {},
        { headers: { ['api-access-key']: this.envConfig.TECH_INDICATOR_SERVICE_API_KEY } }
      );

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   *
   * @example
   * const binanceClient = await BinanceClient.getInstance(EnvConfig.getInstance());
   * const chartCanvasRenderer = new ChartCanvasRenderer();
   * const candles = await binanceClient.getCandles('MATICUSDT', '5m', 150);
   * const { data } = await TechIndicatorService.getInstance(envConfig).getSMIndicator({
   *     chartData: candles,
   *   });
   * const img = chartCanvasRenderer.generateImage(candles, data?.plotShapes, data?.plots, data?.lines);
   * await bot.sendPhoto(message.chat.id, img, { caption: `MATICUSDT price chart` });
   */
  public async getSMIndicator(requestData: SmIndicatorRequest): Promise<SmIndicatorResponse> {
    const response = await axios.post<SmIndicatorResponse>(
      `${this.envConfig.TECH_INDICATOR_SERVICE_URL || this.defaultUrl}/v1/api/smartmoney`,
      requestData,
      { headers: { ['api-access-key']: this.envConfig.TECH_INDICATOR_SERVICE_API_KEY } }
    );

    return response.data;
  }
}
