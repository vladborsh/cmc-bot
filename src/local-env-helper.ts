import { DynamicConfig } from "./dynamic-config";
import { BotCommands } from "./enums";
import { EnvConfig } from "./env-config";
import { MarketDataMapper } from "./market-data-mapper";
import { Requests } from "./requests";

export async function getMarketSelection(command: BotCommands, dynamicConfig: DynamicConfig, envConfig: EnvConfig) {
  const requests = new Requests(envConfig);
  const config = await dynamicConfig.getConfig();
  const marketData = await requests.selectDayTradingFromMarket();
  const marketDataMapper = new MarketDataMapper(config);
  const selection = marketDataMapper.filterAndSortCoins(
    marketData,
    command,
  );
  console.log(selection);
}
