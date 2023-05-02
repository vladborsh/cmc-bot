import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import AWS from 'aws-sdk';
import { filterAndSortCoins } from './src/map-market-data.js';
import { processDayTradingSelectionForMessage, processDayTradingNews } from './src/formatting.js';
import { delay } from './src/utils.js';

// for testing purpose 'https://sandbox-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';

const port = process.env.PORT || 3000;
const cmcUrl = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
const cryptoPanicUrl = 'https://cryptopanic.com/api/v1/posts/';
const cmcToken = process.env.CMC_TOKEN;
const telegramToken = process.env.TG_TOKEN;
const cryptoanicToken = process.env.CRYPTO_PANIC_TOKEN;
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_KEY;
const awsRegion = process.env.AWS_REGION;

// ----------------------------------
// Heroku requires port for listening
// ----------------------------------
const app = express();
app.listen(port, () => {
  console.log(`\n\nServer running on port ${port}.\n\n`);
});

// ----------------------------------
// AWS stuff
// ----------------------------------

AWS.config.update({
  accessKeyId: awsAccessKeyId,
  secretAccessKey: awsSecretAccessKey,
  region: awsRegion,
});

const s3 = new AWS.S3();

function getOmitTokens() {
  const getOmitTokens = {
    Bucket: 'cmc-bot',
    Key: 'omit-tokens.txt',
  };

  return new Promise((resolve, reject) => {
    s3.getObject(getOmitTokens, (err, data) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log(`File "omit-tokens" downloaded successfully. ${data.Body.toString()}`);
        resolve(data.Body.toString().split(','));
      }
    });
  });
}

// ----------------------------------
// Requests
// ----------------------------------

function selectDayTradingFromMarket(commandText, omitTokens) {
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
      resolve(filterAndSortCoins(response.data.data, commandText, omitTokens));
    }
  });
}

async function getNews(cryptoAssets) {
  let newsByAsset = {};
  for (let i = 0; i < cryptoAssets.length; i++) {
    try {
      const asset = cryptoAssets[i];
      const response = await axios.get(`${cryptoPanicUrl}?auth_token=${cryptoanicToken}&currencies=${asset}&filter=important`);
      const news = response.data.results;
      newsByAsset[asset] = news;
      await delay(1000); // add a delay of 1 second between each API call
    } catch (error) {
      console.log(`Error fetching news for ${cryptoAssets[i]}:`, error);
    }
  }
  return newsByAsset;
}

// ----------------------------------
// Telegram communications
// ----------------------------------
const bot = new TelegramBot(telegramToken, { polling: true });

const replyMarkup = {
  keyboard: [[{ text: 'Intra day (24h sort)' }, { text: 'Intra day (7d sort)' }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to my bot! Type /data to get CMC data.', {
    reply_markup: replyMarkup,
  });
});

bot.onText(/[coin_data_24h,coin_data_7d]/, async (command) => {
  console.log(`[${command.date}] ${command.text}`);

  const omitTokens = await getOmitTokens();
  const selection = await selectDayTradingFromMarket(command.text, omitTokens);
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
