export class EnvConfig {
  public PORT = process.env.PORT || 3000;
  public CMC_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
  public CRYPTO_PANIC_URL = 'https://cryptopanic.com/api/v1/posts/';
  public CMC_TOKEN = process.env.CMC_TOKEN;
  public TG_TOKEN = process.env.TG_TOKEN;
  public CRYPTO_PANIC_TOKEN = process.env.CRYPTO_PANIC_TOKEN;
  public AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  public AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
  public AWS_REGION = process.env.AWS_REGION;

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
