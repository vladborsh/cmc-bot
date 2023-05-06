import axios, { AxiosResponse } from "axios";
import { EnvConfig } from "./env-config";
import { NewsArticle } from "./interfaces/news-article.interface";
import { delay } from "./utils";
import { CMCListingInfo } from "./interfaces/cmc-listing-info.interface";

interface CMCResponse {
  data: CMCListingInfo[]
}

export function selectDayTradingFromMarket(
  envConfig: EnvConfig,
): Promise<CMCListingInfo[]> {
  return new Promise(async (resolve, reject) => {
    let response: AxiosResponse<CMCResponse> | null = null;

    try {
      response = await axios.get<CMCResponse>(`${envConfig.CMC_URL}`, {
        headers: {
          'X-CMC_PRO_API_KEY': envConfig.CMC_TOKEN,
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
      reject(ex);
    }
    if (response) {
      resolve(response.data.data);
    }
  });
}

export async function getNews(cryptoAssets: string[], envConfig: EnvConfig,) {
  let newsByAsset: Record<string, NewsArticle[]> = {};
  for (let i = 0; i < cryptoAssets.length; i++) {
    try {
      const asset = cryptoAssets[i];
      const response = await axios.get(
        `${envConfig.CRYPTO_PANIC_URL}?auth_token=${envConfig.CRYPTO_PANIC_TOKEN}&currencies=${asset}&filter=important`
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
