import { Injectable, Logger } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private snsClient: SNSClient | null = null;

  constructor() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      this.snsClient = new SNSClient({
        region: region ?? 'sa-east-1',
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  async sendSms(phone: string, message: string): Promise<void> {
    if (!this.snsClient) {
      this.logger.log(`[SMS MOCK] To: ${phone} | Message: ${message}`);
      return;
    }

    await this.snsClient.send(new PublishCommand({
      PhoneNumber: phone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    }));
    this.logger.log(`SMS sent to ${phone}`);
  }
}
