import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { UserState, WatchListItem } from './interfaces/user-state.interface';
import { EnvConfig } from '../env-config';
import { BotStates } from '../enums';
import TelegramBot from 'node-telegram-bot-api';

export class DynamoDBClient {
  private docClient: DocumentClient;
  private static instance: DynamoDBClient;
  private tableName: string;

  private constructor(envConfig: EnvConfig) {
    this.tableName = envConfig.AWS_DYNAMO_TABLE_NAME || '';

    AWS.config.update({
      accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
      secretAccessKey: envConfig.AWS_SECRET_KEY,
      region: envConfig.AWS_REGION,
    });

    this.docClient = new AWS.DynamoDB.DocumentClient();
  }

  public static getInstance(envConfig: EnvConfig): DynamoDBClient {
    if (!this.instance) {
      this.instance = new DynamoDBClient(envConfig);
    }

    return this.instance;
  }

  async getAllItems(): Promise<UserState[]> {
    const params: DocumentClient.ScanInput = {
      TableName: this.tableName,
    };

    try {
      const data = await this.docClient.scan(params).promise();
      return data.Items as UserState[];
    } catch (err) {
      console.error('Unable to scan items. Error JSON:', JSON.stringify(err, null, 2));
      return [];
    }
  }

  public async getUserState(chatId: TelegramBot.ChatId): Promise<UserState | null> {
    const params: DocumentClient.GetItemInput = {
      TableName: this.tableName,
      Key: { chatId: chatId.toString() },
    };

    try {
      const data = await this.docClient.get(params).promise();
      return data.Item as UserState;
    } catch (err) {
      console.error('Unable to read item. Error JSON:', JSON.stringify(err, null, 2));
      return null;
    }
  }

  public async updateDialogState(
    chatId: TelegramBot.ChatId,
    dialogState: BotStates
  ): Promise<void> {
    try {
      await this.docClient
        .update(this.updateUpdateItemInput<UserState>(chatId, 'dialogState', dialogState))
        .promise();
    } catch (err) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
    }
  }

  public async addItemToWatchList(
    chatId: TelegramBot.ChatId,
    watchListItem: WatchListItem
  ): Promise<void> {
    try {
      const state = await this.getUserState(chatId);
      const old = state?.watchList ? state.watchList : [];

      await this.updateWatchList(chatId, [...old, watchListItem]);
    } catch (err) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
    }
  }

  public async updateWatchList(
    chatId: TelegramBot.ChatId,
    watchList: WatchListItem[]
  ): Promise<void> {
    try {
      await this.docClient
        .update(this.updateUpdateItemInput<UserState>(chatId, 'watchList', watchList))
        .promise();
    } catch (err) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
    }
  }

  public async updateLastSelectedCrypto(
    chatId: TelegramBot.ChatId,
    lastSelectedCrypto: string[]
  ): Promise<void> {
    try {
      await this.docClient
        .update(
          this.updateUpdateItemInput<UserState>(chatId, 'lastSelectedCrypto', lastSelectedCrypto)
        )
        .promise();
    } catch (err) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
    }
  }

  public async saveUserState(settings: UserState): Promise<void> {
    const params: DocumentClient.PutItemInput = {
      TableName: this.tableName,
      Item: {
        ...settings,
      },
    };

    try {
      await this.docClient.put(params).promise();
    } catch (err) {
      console.error('Unable to write item. Error JSON:', JSON.stringify(err, null, 2));
    }
  }

  private updateUpdateItemInput<T>(
    chatId: TelegramBot.ChatId,
    fieldKey: keyof T,
    fieldValue: T[keyof T]
  ): DocumentClient.UpdateItemInput {
    return {
      TableName: this.tableName,
      Key: { chatId: chatId.toString() },
      UpdateExpression: `set ${fieldKey.toString()} = :fieldValue`,
      ExpressionAttributeValues: {
        ':fieldValue': fieldValue,
      },
      ReturnValues: 'UPDATED_NEW',
    };
  }
}
