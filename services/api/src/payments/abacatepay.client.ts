import { Injectable, Logger } from '@nestjs/common';

interface AbacatePayCreateResponse {
  id: string;
  brCode: string;
  brCodeBase64: string;
}

@Injectable()
export class AbacatePayClient {
  private readonly logger = new Logger(AbacatePayClient.name);
  private readonly apiKey = process.env.ABACATEPAY_API_KEY ?? '';
  private readonly baseUrl = 'https://api.abacatepay.com/v1';

  async createPixBilling(amountCents: number, phone: string): Promise<AbacatePayCreateResponse> {
    if (!this.apiKey) {
      this.logger.log(`[PIX MOCK] Creating PIX for ${amountCents} cents, phone: ${phone}`);
      return {
        id: `mock_${Date.now()}`,
        brCode: '00020126580014br.gov.bcb.pix0136mock-pix-code5204000053039865802BR5925Mock Merchant Name6009SAO PAULO62070503***6304MOCK',
        brCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
    }

    const response = await fetch(`${this.baseUrl}/billing/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frequency: 'ONE_TIME',
        methods: ['PIX'],
        products: [{ externalId: `balance_topup_${Date.now()}`, name: 'Saldo Gamer Machine', quantity: 1, price: amountCents }],
        customer: { cellphone: phone, taxId: { type: 'CPF', number: '00000000000' } },
      }),
    });

    const data = await response.json() as any;
    return { id: data.id, brCode: data.pixQrCode, brCodeBase64: data.pixQrCodeBase64 };
  }
}
