import { CloudWatchLogs } from 'aws-sdk';
import winston, { format, Logger } from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import { EnvConfig } from '../env-config';

export abstract class LoggerBase {
  protected constructor(private envConfig: EnvConfig) {}

  protected createLogger(streamName: string): Logger {
    const cloudWatchConfig = {
      accessKeyId: this.envConfig.AWS_ACCESS_KEY_ID,
      secretAccessKey: this.envConfig.AWS_SECRET_KEY,
      region: this.envConfig.AWS_REGION,
    };

    const cloudWatchLogs = new CloudWatchLogs(cloudWatchConfig);

    return winston.createLogger({
      format: format.combine(format.timestamp(), format.json()),
      transports: [
        new WinstonCloudWatch({
          logGroupName: this.envConfig.LOG_GROUP_NAME,
          logStreamName: streamName,
          cloudWatchLogs,
          jsonMessage: true,
          awsRegion: this.envConfig.AWS_REGION,
          awsAccessKeyId: cloudWatchConfig.accessKeyId,
          awsSecretKey: cloudWatchConfig.secretAccessKey,
        }),
        new winston.transports.Console(),
      ],
    });
  }
}
