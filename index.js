import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';

// for testing purpose
// const url_test        = 'https://sandbox-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';

const cmcUrl          = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest' ;
const cryptoPanicUrl  = 'https://cryptopanic.com/api/v1/posts/'                               ;
const cmcToken        = process.env.CMC_TOKEN                                                 ;
const telegramToken   = process.env.TG_TOKEN                                                  ;
const cryptoanicToken = process.env.CRYPTO_PANIC_TOKEN                                        ;
const totalSelection  = 7                                                                     ;
const newsLimit       = 3                                                                     ;
const newsAgeDays     = 30                                                                    ;
const omitSymbols     = ['BTC', 'USDT', 'USDC', 'ETH', 'BSV']                                 ;

const getCryptopanicUrl = (cryptoAssets, token) => {
  return `${cryptoPanicUrl}?auth_token=${token}&currencies=${cryptoAssets}&filter=important`;
};

const replyMarkup = {
  keyboard: [[{ text: 'Intra day (24h sort)' }, { text: 'Intra day (7d sort)' }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const bot = new TelegramBot(telegramToken, { polling: true });

function filterAndSortCoins(data, command) {
  let filterPercentage;
  let sortPercentage;

  if (command.text === 'Intra day (24h sort)') {
    filterPercentage = (listing) => Math.abs(listing.quote.USD.percent_change_24h) > 3;
    sortPercentage = (a, b) => {
      const percent_change_24h =
        Math.abs(b.quote.USD.percent_change_24h) - Math.abs(a.quote.USD.percent_change_24h);

      return percent_change_24h;
    };
  } else if (command.text === 'Intra day (7d sort)') {
    filterPercentage = (listing) => Math.abs(listing.quote.USD.percent_change_7d) > 7;
    sortPercentage = (a, b) => {
      const percent_change_7d =
        Math.abs(b.quote.USD.percent_change_7d) - Math.abs(a.quote.USD.percent_change_7d);

      return percent_change_7d;
    };
  } else {
    filterPercentage = () => true;
    sortPercentage = (a, b) => b.quote.USD.volume_24h - a.quote.USD.volume_24h;
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

function selectDayTradingFromMarket(command) {
  return new Promise(async (resolve, reject) => {
    let response = null;

    try {
      response = await axios.get(`${cmcUrl}`, {
        headers: {
          'X-CMC_PRO_API_KEY': cmcToken,
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
      resolve(filterAndSortCoins(response.data.data, command));
    }
  });
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

function formatCurrency(number, currencyCode) {
  return number.toLocaleString('en-US', {
    style: 'currency',
    currency: currencyCode,
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function getNews(cryptoAssets) {
  let newsByAsset = {};
  for (let i = 0; i < cryptoAssets.length; i++) {
    try {
      const asset = cryptoAssets[i];
      const response = await axios.get(getCryptopanicUrl(asset, cryptoanicToken));
      const news = response.data.results;
      newsByAsset[asset] = news;
      await delay(1000); // add a delay of 1 second between each API call
    } catch (error) {
      console.log(`Error fetching news for ${cryptoAssets[i]}:`, error);
    }
  }
  return newsByAsset;
}

function processDayTradingSelectionForMessage(selection) {
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

function processDayTradingNews(newsByAsset) {
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

// ----------------------------------
// Telegram communications
// ----------------------------------

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to my bot! Type /data to get CMC data.', {
    reply_markup: replyMarkup,
  });
});

bot.onText(/[coin_data_24h,coin_data_7d]/, async (command) => {
  console.log(`[${command.date}] ${command.text}`);

  const selection = await selectDayTradingFromMarket(command);

  const coinTechMessage = processDayTradingSelectionForMessage(selection);

  bot.sendMessage(command.chat.id, coinTechMessage, {
    parse_mode: 'MarkdownV2',
    reply_markup: {},
  });

  const newsByAsset = await getNews(selection.map((listing) => listing.symbol));

  try {
    const coinNewsMessage = processDayTradingNews(newsByAsset);

    bot.sendMessage(command.chat.id, coinNewsMessage, {
      parse_mode: 'MarkdownV2',
      reply_markup: replyMarkup,
      disable_web_page_preview: true,
    });
  } catch (e) {
    bot.sendMessage(command.chat.id, `Can't retrieve news at the moment 🤷‍♂️`, {
      parse_mode: 'MarkdownV2',
      reply_markup: replyMarkup,
      disable_web_page_preview: true,
    });
  }
});
