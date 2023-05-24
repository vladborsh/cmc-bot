import { GeneralTimeIntervals } from "../enums";
import { EnvConfig } from "../env-config";
import { BinanceClient } from "../exchange/binance-client";

export async function validateChartForSelectedCryptoCommand(
  text: string | undefined,
  envConfig: EnvConfig,
): Promise<void> {
  if (!text) {
    throw new Error(`invalid command: "${text}"`);
  }
  const [asset, timeFrame, exchange] = text.split(' ');
  if (!exchange || exchange === 'binance') {
    if (!asset || !asset.toUpperCase().includes('USDT')) {
      throw new Error(`invalid asset name: "${asset}"`);
    }
    const binanceClient = BinanceClient.getInstance(envConfig);
    if (!(await binanceClient.isSymbolExists(asset.toUpperCase()))) {
      throw new Error(`Binance does not support: "${asset}"`);
    }
  }
  if (!timeFrame || !ALLOWED_TIME_FRAMES.includes(timeFrame as GeneralTimeIntervals)) {
    throw new Error(`invalid time frame: "${timeFrame}"`);
  }
}

const ALLOWED_TIME_FRAMES: GeneralTimeIntervals[] = [
  GeneralTimeIntervals.m1,
  GeneralTimeIntervals.m5,
  GeneralTimeIntervals.m15,
  GeneralTimeIntervals.h1,
  GeneralTimeIntervals.h4,
];
