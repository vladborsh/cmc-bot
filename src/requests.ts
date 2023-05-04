import axios from "axios";
import { EnvConfig } from "./env-config";
import { NewsArticle } from "./interfaces/news-article";
import { MappedListing } from "./interfaces/mapped-listing";
import { filterAndSortCoins } from "./map-market-data";
import { delay } from "./utils";

export function selectDayTradingFromMarket(
  commandText: string,
  omitTokens: string[],
  envConfig: EnvConfig,
): Promise<MappedListing[]> {
  return new Promise(async (resolve, reject) => {
    let response = null;

    try {
      response = await axios.get(`${envConfig.cmcUrl}`, {
        headers: {
          'X-CMC_PRO_API_KEY': envConfig.cmcToken,
        },
        params: {
          limit: 100,
          sort: 'market_cap',
          sort_dir: 'desc',
          volume_24h_min: 20000000,
        },
      });
    } catch (ex) {
      response = null;
      console.log(ex);
      reject(ex);
    }
    if (response) {
      resolve(filterAndSortCoins(response.data.data, commandText, omitTokens));
    }
  });
}

export async function getNews(cryptoAssets: string[], envConfig: EnvConfig,) {
  let newsByAsset: Record<string, NewsArticle[]> = {};
  for (let i = 0; i < cryptoAssets.length; i++) {
    try {
      const asset = cryptoAssets[i];
      const response = await axios.get(
        `${envConfig.cryptoPanicUrl}?auth_token=${envConfig.cryptoanicToken}&currencies=${asset}&filter=important`
      );
      const news = response.data.results;
      newsByAsset[asset] = news;
      await delay(1000); // add a delay of 1 second between each API call
    } catch (error) {
      console.log(`Error fetching news for ${cryptoAssets[i]}:`, error);
    }
  }
  return newsByAsset;
}
