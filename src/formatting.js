const newsLimit = 3;
const newsAgeDays = 30;

export function processDayTradingSelectionForMessage(selection) {
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

export function processDayTradingNews(newsByAsset) {
  return Object.entries(newsByAsset).reduce((res, [asset, news]) => {
    const filteredByDateNews = news.filter((article) =>
      validateDate(article.created_at, newsAgeDays)
    );

    if (!filteredByDateNews.length) {
      return res;
    }

    let message = `\n*${asset}*:\n\n`;

    for (let i = 0; i < newsLimit && i < filteredByDateNews.length; i++) {
      message += `${prepareString(filteredByDateNews[i].title).replace(
        /\n/g,
        '\\|'
      )}\n${prepareString(filteredByDateNews[i].url)}\n\n`;
    }

    return res.concat(message);
  }, 'News for day trading: \n');
}

function validateDate(date, daysLimit) {
  const pickedDate = new Date(date);
  const todaysDate = new Date();
  todaysDate.setHours(0, 0, 0, 0);
  const dateDifference = Math.abs(Number(todaysDate) - pickedDate);

  if (dateDifference > 1000 * 60 * 60 * 24 * daysLimit) {
    return false;
  } else {
    return true;
  }
}

function prepareString(str) {
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
