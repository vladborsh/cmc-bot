export class EnvConfig {
  public PORT = process.env.PORT || 4111;
  public CMC_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
  public CRYPTO_PANIC_URL = 'https://cryptopanic.com/api/v1/posts/';
  public CAPITAL_COM_URL = 'https://api-capital.backend-capital.com/';
  public CAPITAL_COM_WS_URL = 'wss://api-streaming-capital.backend-capital.com/connect';
  public TECH_INDICATOR_SERVICE_URL = process.env.TECH_INDICATOR_SERVICE_URL;
  public TECH_INDICATOR_SERVICE_API_KEY = process.env.TECH_INDICATOR_SERVICE_API_KEY;
  public CMC_TOKEN = process.env.CMC_TOKEN;
  public TG_TOKEN = process.env.TG_TOKEN;
  public CRYPTO_PANIC_TOKEN = process.env.CRYPTO_PANIC_TOKEN;
  public AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  public AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
  public AWS_REGION = process.env.AWS_REGION;
  public AWS_DYNAMO_TABLE_NAME = process.env.AWS_DYNAMO_TABLE_NAME;
  public LOG_GROUP_NAME = process.env.LOG_GROUP_NAME;
  public BINANCE_API_KEY = process.env.BINANCE_API_KEY;
  public BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;
  public CAPITAL_COM_API_KEY = process.env.CAPITAL_COM_API_KEY;
  public CAPITAL_COM_CUSTOM_PASS = process.env.CAPITAL_COM_CUSTOM_PASS;
  public CAPITAL_COM_IDENTIFIER = process.env.CAPITAL_COM_IDENTIFIER;

  private static instance: EnvConfig;

  private constructor() {}

  public static getInstance(): EnvConfig {
    if (!this.instance) {
      this.instance = new EnvConfig();
    }

    return this.instance;
  }
}

// for testing purpose we can use - 'https://sandbox-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
