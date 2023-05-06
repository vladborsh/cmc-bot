export interface CMCListingInfo {
  symbol: string;
  name: string;
  quote: {
    USD: {
      percent_change_24h: number;
      percent_change_7d: number;
      volume_change_24h: number;
      volume_24h: number;
      volume_7d: number;
    }
  }
}
