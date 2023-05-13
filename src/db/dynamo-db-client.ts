import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { UserState } from './interfaces/user-state.interface';
import { EnvConfig } from '../env-config';
import { BotStates } from '../enums';

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

  public async getUserState(chatId: string): Promise<UserState | null> {
    const params: DocumentClient.GetItemInput = {
      TableName: this.tableName,
      Key: { chatId: chatId },
    };

    try {
      const data = await this.docClient.get(params).promise();
      return data.Item as UserState;
    } catch (err) {
      console.error('Unable to read item. Error JSON:', JSON.stringify(err, null, 2));
      return null;
    }
  }

  public async updateDialogState(chatId: string, dialogState: BotStates): Promise<void> {
    try {
      await this.docClient
        .update(this.updateUpdateItemInput(chatId, 'dialogState', dialogState))
        .promise();
    } catch (err) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
    }
  }

  public async updateLastSelectedCrypto(chatId: string, lastSelectedCrypto: string[]): Promise<void> {
    try {
      await this.docClient
        .update(this.updateUpdateItemInput(chatId, 'lastSelectedCrypto', lastSelectedCrypto))
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
    chatId: string,
    fieldKey: string,
    fieldValue: T
  ): DocumentClient.UpdateItemInput {
    return {
      TableName: this.tableName,
      Key: { chatId: chatId },
      UpdateExpression: `set ${fieldKey} = :fieldValue`,
      ExpressionAttributeValues: {
        ':fieldValue': fieldValue,
      },
      ReturnValues: 'UPDATED_NEW',
    };
  }
}
