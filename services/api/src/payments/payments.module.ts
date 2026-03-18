import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AbacatePayClient } from './abacatepay.client';

@Module({
  providers: [PaymentsService, AbacatePayClient],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
