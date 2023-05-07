import { MappedListing } from "./interfaces/mapped-listing.interface";

export function processDayTradingSelectionForMessage(selection: MappedListing[]) {
  return selection.reduce((res, listing, i) => {
    return res
      .concat(`\n \\#${i + 1}: __ *${listing.symbol}* __ \\(${prepareString(listing.name)}\\)`)
      .concat(`\n \\- Price change 7d: ${prepareString(listing.priceChange7d)}%`)
      .concat(`\n \\- Price change 24h: ${prepareString(listing.priceChange24h)}%`)
      .concat(`\n \\- Volume 24h: ${prepareString(listing.volume24h)}`)
      .concat(`\n \\- Volume change 24h: ${prepareString(listing.volumeChange24h)}%`)
      .concat(`\n`);
  }, 'Day trading selection: \n');
}

export function prepareString(str: string): string {
  return str
    .replace(/\-/g, '\\-')
    .replace(/\./g, '\\.')
    .replace(/\!/g, '\\!')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\#/g, '\\#')
    .replace(/\=/g, '\\=');
}

export const chop = (str: string): string => str.substring(0, str.length - 1);

