import { Logger } from 'winston';
import { LoggerBase } from './logger-base';
import { EnvConfig } from '../env-config';

export class WatchListLogger extends LoggerBase {
  private static instance: Logger;

  private constructor(envConfig: EnvConfig) {
    super(envConfig);
    if (!WatchListLogger.instance) {
      WatchListLogger.instance = this.createLogger('watchlist');
    }
  }

  public static getInstance(envConfig: EnvConfig): Logger {
    if (!this.instance) {
      new WatchListLogger(envConfig);
    }
    return this.instance;
  }
}
