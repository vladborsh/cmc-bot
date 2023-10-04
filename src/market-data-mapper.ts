import { CMCListingInfo } from './interfaces/cmc-listing-info.interface';
import { DynamicConfigValues } from './interfaces/dynamic-config.interface';
import { MappedListing } from './interfaces/mapped-listing.interface';
import { BotCommands } from './enums';

export class MarketDataMapper {
  constructor(private config: DynamicConfigValues) {}

  public filterAndSortCoins(data: CMCListingInfo[], commandText: BotCommands): MappedListing[] {
    console.log(data[0]);

    let sorter: (a: CMCListingInfo, b: CMCListingInfo) => number = (
      a: CMCListingInfo,
      b: CMCListingInfo
    ) => b.quote.USD.volume_change_24h - a.quote.USD.volume_change_24h;

    const filteredListings = data.filter(
      (listing) =>
        !this.config.OMIT_TOKENS.includes(listing.symbol) &&
        listing.quote.USD.volume_24h > this.config.MIN_DAILY_VOLUME &&
        listing.quote.USD.volume_change_24h < this.config.MAX_DAILY_VOLUME_CHANGE &&
        listing.quote.USD.volume_change_24h > this.config.MIN_DAILY_VOLUME_CHANGE &&
        (listing.quote.USD.volume_24h / listing.quote.USD.market_cap) > 0.2
    );

    filteredListings.sort((a, b) => sorter(a, b));

    return filteredListings.slice(0, this.config.SELECTION_NUMBER).map((listing) => ({
      name: listing.name,
      symbol: listing.symbol,
      marketCap: this.formatCurrency(Math.floor(listing.quote.USD.market_cap), 'USD'),
      priceChange7d: listing.quote.USD.percent_change_7d.toFixed(2).toString(),
      priceChange24h: listing.quote.USD.percent_change_24h.toFixed(2).toString(),
      volume24h: this.formatCurrency(Math.floor(listing.quote.USD.volume_24h), 'USD'),
      volumeChange24h: listing.quote.USD.volume_change_24h.toFixed(2).toString(),
    }));
  }

  private formatCurrency(num: number, currencyCode: string) {
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: currencyCode,
    });
  }
}
