import axios, { AxiosResponse } from "axios";
import { EnvConfig } from "./env-config";
import { NewsArticle } from "./interfaces/news-article.interface";
import { delay } from "./utils";
import { CMCListingInfo } from "./interfaces/cmc-listing-info.interface";

interface CMCResponse {
  data: CMCListingInfo[]
}

export class Requests {
  constructor(private envConfig: EnvConfig) {}

  selectDayTradingFromMarket(): Promise<CMCListingInfo[]> {
    return new Promise(async (resolve, reject) => {
      let response: AxiosResponse<CMCResponse> | null = null;

      try {
        response = await axios.get<CMCResponse>(`${this.envConfig.CMC_URL}`, {
          headers: {
            'X-CMC_PRO_API_KEY': this.envConfig.CMC_TOKEN,
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

  async getNews(cryptoAssets: string[]) {
    let newsByAsset: Record<string, NewsArticle[]> = {};
    for (let i = 0; i < cryptoAssets.length; i++) {
      try {
        const asset = cryptoAssets[i];
        const response = await axios.get(
          `${this.envConfig.CRYPTO_PANIC_URL}?auth_token=${this.envConfig.CRYPTO_PANIC_TOKEN}&currencies=${asset}&filter=important`
        );
        const news = response.data.results;
        newsByAsset[asset] = news;
        await delay(1000); // add a delay of 1 second between each API call
      } catch (error) {
        console.error(`Error fetching news for ${cryptoAssets[i]}:`, error);
      }
    }
    return newsByAsset;
  }
}

