export class EnvConfig {
  public port = process.env.PORT || 3000;
  public cmcUrl = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
  public cryptoPanicUrl = 'https://cryptopanic.com/api/v1/posts/';
  public cmcToken = process.env.CMC_TOKEN;
  public telegramToken = process.env.TG_TOKEN;
  public cryptoanicToken = process.env.CRYPTO_PANIC_TOKEN;
  public awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  public awsSecretAccessKey = process.env.AWS_SECRET_KEY;
  public awsRegion = process.env.AWS_REGION;

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
