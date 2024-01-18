import AWS from 'aws-sdk';
import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../env-config';

export class PhotoSender {
  private s3: AWS.S3;
  private bucketName = 'temporal-photo-store';
  private static instance: PhotoSender;

  private constructor(envConfig: EnvConfig) {
    AWS.config.update({
      accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
      secretAccessKey: envConfig.AWS_SECRET_KEY,
      region: envConfig.AWS_REGION,
    });

    this.s3 = new AWS.S3();
  }

  public static getInstance(envConfig: EnvConfig): PhotoSender {
    if (!this.instance) {
      this.instance = new PhotoSender(envConfig);
    }

    return this.instance;
  }

  async uploadToS3(photoBuffer: Buffer, fileName: string): Promise<string> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: photoBuffer,
      ACL: 'public-read',
    };

    const response = await this.s3.upload(params).promise();
    return response.Location;
  }

  async getMediaURLs(photoBuffers: Buffer[]): Promise<TelegramBot.InputMediaPhoto[]> {
    const photoUrls: TelegramBot.InputMediaPhoto[] = [];

    for (const [index, buffer] of photoBuffers.entries()) {
      const fileName = `photo_${Date.now()}_${index}.jpg`;
      const url = await this.uploadToS3(buffer, fileName);
      photoUrls.push({ type: 'photo', media: url });
    }

    return photoUrls;
  }
}
