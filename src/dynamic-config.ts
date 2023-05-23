import AWS from "aws-sdk";
import { EnvConfig } from "./env-config";
import { DynamicConfigValues } from "./interfaces/dynamic-config.interface";

export class DynamicConfig {
  private s3: AWS.S3;
  private static instance: DynamicConfig;

  private constructor(envConfig: EnvConfig) {
    AWS.config.update({
      accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
      secretAccessKey: envConfig.AWS_SECRET_KEY,
      region:envConfig.AWS_REGION,
    });

    this.s3 = new AWS.S3();
  }

  public static getInstance(envConfig: EnvConfig): DynamicConfig {
    if (!this.instance) {
      this.instance = new DynamicConfig(envConfig);
    }

    return this.instance;
  }

  public getConfig(): Promise<DynamicConfigValues> {
    const getOmitTokens = {
      Bucket: 'cmc-bot',
      Key: 'dynamic_config.json',
    };

    return new Promise((resolve, reject) => {
      this.s3.getObject(getOmitTokens, (err, data) => {
        if (err) {
          console.error(err);
          reject(err);
          return;
        }

        if (!data.Body) {
          reject('data Body was not provided');
          return;
        }

        try {
          const config: DynamicConfigValues = JSON.parse(data.Body.toString());
          resolve(config);
        } catch(e) {
          reject('config parsing failed');
        }
      });
    });
  }
}
