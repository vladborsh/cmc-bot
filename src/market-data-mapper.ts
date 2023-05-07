import { CMCListingInfo } from './interfaces/cmc-listing-info.interface';
import { DynamicConfigValues } from './interfaces/dynamic-config.interface';
import { MappedListing } from './interfaces/mapped-listing.interface';
import { BotCommands } from './enums';

export class MarketDataMapper {
  constructor(private config: DynamicConfigValues) {}

  public filterAndSortCoins(data: CMCListingInfo[], commandText: BotCommands): MappedListing[] {
    let filter: (listing: CMCListingInfo) => boolean;
    let sorter: (a: CMCListingInfo, b: CMCListingInfo) => number;

    if (commandText === BotCommands.price24h) {
      filter = (listing: CMCListingInfo) =>
        listing.quote.USD.volume_24h > this.config.MIN_DAILY_VOLUME;
      sorter = (a: CMCListingInfo, b: CMCListingInfo) => {
        const percent_change_24h =
          Math.abs(b.quote.USD.percent_change_24h) - Math.abs(a.quote.USD.percent_change_24h);

        return percent_change_24h;
      };
    } else if (commandText === BotCommands.price7d) {
      filter = (listing: CMCListingInfo) =>
        Math.abs(listing.quote.USD.percent_change_24h) > this.config.MIN_DAILY_PERCENT_CHANGE &&
        listing.quote.USD.volume_24h > this.config.MIN_DAILY_VOLUME;
      sorter = (a: CMCListingInfo, b: CMCListingInfo) => {
        const percent_change_7d =
          Math.abs(b.quote.USD.percent_change_7d) - Math.abs(a.quote.USD.percent_change_7d);

        return percent_change_7d;
      };
    } else if (commandText === BotCommands.volume24h) {
      filter = (listing: CMCListingInfo) =>
        Math.abs(listing.quote.USD.percent_change_24h) > this.config.MIN_DAILY_PERCENT_CHANGE;
      sorter = (a: CMCListingInfo, b: CMCListingInfo) =>
        b.quote.USD.volume_24h - a.quote.USD.volume_24h;
    } else {
      filter = () => true;
      sorter = (a: CMCListingInfo, b: CMCListingInfo) =>
        b.quote.USD.volume_24h - a.quote.USD.volume_7d;
    }

    const filteredListings = data.filter(
      (listing) =>
        !this.config.OMIT_TOKENS.includes(listing.symbol) &&
        filter(listing) &&
        listing.quote.USD.volume_change_24h < this.config.MAX_DAILY_VOLUME_CHANGE &&
        listing.quote.USD.volume_change_24h > this.config.MIN_DAILY_VOLUME_CHANGE
    );

    filteredListings.sort((a, b) => sorter(a, b));

    return filteredListings.slice(0, this.config.SELECTION_NUMBER).map((listing) => ({
      name: listing.name,
      symbol: listing.symbol,
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
