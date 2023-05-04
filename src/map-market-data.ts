import { CMCListingInfo } from "./interfaces/cmc-listing-info";
import { MappedListing } from "./interfaces/mapped-listing";
import { BotCommands } from "./static-config";

const totalSelection = 7;

export function filterAndSortCoins(data: CMCListingInfo[], commandText: string, omitSymbols: string[]): MappedListing[] {
  let filterPercentage: (listing: CMCListingInfo) => boolean;
  let sortPercentage: (a: CMCListingInfo, b: CMCListingInfo) => number;

  if (commandText === BotCommands.price24h) {
    filterPercentage = (listing: CMCListingInfo) => listing.quote.USD.volume_24h > 30000000;

    sortPercentage = (a: CMCListingInfo, b: CMCListingInfo) => {
      const percent_change_24h =
        Math.abs(b.quote.USD.percent_change_24h) - Math.abs(a.quote.USD.percent_change_24h);

      return percent_change_24h;
    };
  } else if (commandText === BotCommands.price7d) {
    filterPercentage = (listing: CMCListingInfo) => Math.abs(listing.quote.USD.percent_change_24h) > 2 && listing.quote.USD.volume_24h > 50000000;
    sortPercentage = (a: CMCListingInfo, b: CMCListingInfo) => {
      const percent_change_7d =
        Math.abs(b.quote.USD.percent_change_7d) - Math.abs(a.quote.USD.percent_change_7d);

      return percent_change_7d;
    };
  } else if (commandText === BotCommands.volume24h) {
    filterPercentage = (listing: CMCListingInfo) => Math.abs(listing.quote.USD.percent_change_24h) > 2;
    sortPercentage = (a: CMCListingInfo, b: CMCListingInfo) => b.quote.USD.volume_24h - a.quote.USD.volume_24h;
  } else {
    filterPercentage = () => true;
    sortPercentage = (a: CMCListingInfo, b: CMCListingInfo) => b.quote.USD.volume_24h - a.quote.USD.volume_7d;
  }

  const filteredListings = data.filter(
    (listing) =>
      !omitSymbols.includes(listing.symbol) &&
      filterPercentage(listing) &&
      listing.quote.USD.volume_change_24h < 50 &&
      listing.quote.USD.volume_change_24h > 1
  );

  filteredListings.sort((a, b) => sortPercentage(a, b));

  return filteredListings.slice(0, totalSelection).map((listing) => ({
    name: listing.name,
    symbol: listing.symbol,
    priceChange7d: listing.quote.USD.percent_change_7d.toFixed(2).toString(),
    priceChange24h: listing.quote.USD.percent_change_24h.toFixed(2).toString(),
    volume24h: formatCurrency(Math.floor(listing.quote.USD.volume_24h), 'USD'),
    volumeChange24h: listing.quote.USD.volume_change_24h.toFixed(2).toString(),
  }));
}

function formatCurrency(num: number, currencyCode: string) {
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: currencyCode,
  });
}
