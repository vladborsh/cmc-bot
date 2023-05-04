import AWS from "aws-sdk";
import { EnvConfig } from "./env-config";

export class DynamicConfig {
  private s3: AWS.S3;
  private static instance: DynamicConfig;

  private constructor(envConfig: EnvConfig) {
    AWS.config.update({
      accessKeyId: envConfig.awsAccessKeyId,
      secretAccessKey: envConfig.awsSecretAccessKey,
      region:envConfig.awsRegion,
    });

    this.s3 = new AWS.S3();
  }

  public static getInstance(envConfig: EnvConfig): DynamicConfig {
    if (!this.instance) {
      this.instance = new DynamicConfig(envConfig);
    }

    return this.instance;
  }

  public getOmitTokens(): Promise<string[]> {
    const getOmitTokens = {
      Bucket: 'cmc-bot',
      Key: 'omit-tokens.txt',
    };

    return new Promise((resolve, reject) => {
      this.s3.getObject(getOmitTokens, (err, data) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          if (!data.Body) {
            reject('data Body was not provided');
            return;
          }
          console.log(`File "omit-tokens" downloaded successfully. ${data.Body.toString()}`);
          resolve(data.Body.toString().split(','));
        }
      });
    });
  }
}
