import { GeneralTimeIntervals } from "../enums";
import { EnvConfig } from "../env-config";
import { BinanceClient } from "../exchange/binance-client";
import { ParsedAssetInfo } from "../interfaces/parsed-asset-info.interface";
import { Exchange } from "../interfaces/user-state.interface";

export async function validateChartForSelectedCryptoCommand(
  text: string | undefined,
  envConfig: EnvConfig,
): Promise<ParsedAssetInfo> {
  if (!text) {
    throw new Error(`invalid command: there is no text`);
  }
  let [asset, timeFrame, exchange] = text.split(' ');

  asset = asset.toUpperCase();

  if (ASSET_SHORTCUTS[asset]) {
    const [assetName, exchangeName] = ASSET_SHORTCUTS[asset];
    asset = assetName;
    exchange = exchangeName;
  }

  if (EXCHANGE_SHORTCUTS[asset] && !exchange) {
    const exchangeName = EXCHANGE_SHORTCUTS[asset];
    exchange = exchangeName;
  }

  if (!exchange || exchange === 'binance') {
    if (!asset.includes('USDT')) {
      asset = `${asset}USDT`
    }
    const binanceClient = BinanceClient.getInstance(envConfig);
    if (!(await binanceClient.isSymbolExists(asset))) {
      throw new Error(`Binance does not support: "${asset}"`);
    }
  }
  if (!timeFrame || !ALLOWED_TIME_FRAMES.includes(timeFrame as GeneralTimeIntervals)) {
    throw new Error(`invalid time frame: "${timeFrame}"`);
  }

  return {
    asset,
    timeFrame: timeFrame as GeneralTimeIntervals,
    exchange: exchange as Exchange,
  }
}

const ALLOWED_TIME_FRAMES: GeneralTimeIntervals[] = [
  GeneralTimeIntervals.m1,
  GeneralTimeIntervals.m5,
  GeneralTimeIntervals.m15,
  GeneralTimeIntervals.h1,
  GeneralTimeIntervals.h4,
];

const EXCHANGE_SHORTCUTS: Record<string, Exchange> = {
  'BN': Exchange.binance,
  'CRYPTO': Exchange.binance,
  'FX': Exchange.capitalcom,
}

const ASSET_SHORTCUTS: Record<string, [string, Exchange]> = {
  'BTC': ['BTCUSDT', Exchange.binance],
  'ETH': ['ETHUSDT', Exchange.binance],
  'BNB': ['BNBUSDT', Exchange.binance],
  'MATIC': ['MATICUSDT', Exchange.binance],
  'NEAR': ['NEARUSDT', Exchange.binance],
  'DYDX': ['DYDXUSDT', Exchange.binance],
  'DXY': ['DXY', Exchange.capitalcom],
  'GBP': ['GBPUSD', Exchange.capitalcom],
  'GU': ['GBPUSD', Exchange.capitalcom],
  'EUR': ['EURUSD', Exchange.capitalcom],
  'EU': ['EURUSD', Exchange.capitalcom],
  'EURO': ['EURUSD', Exchange.capitalcom],
  'US500': ['US500', Exchange.capitalcom],
  'US100': ['US100', Exchange.capitalcom],
}
