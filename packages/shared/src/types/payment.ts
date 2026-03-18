export type PaymentStatus = 'pending' | 'paid' | 'expired';

export interface PaymentDto {
  id: string;
  user_id: string;
  amount_cents: number;
  status: PaymentStatus;
  qr_code?: string;
  qr_code_text?: string;
  created_at: string;
}

export interface CreatePixDto {
  amount_cents: number;
}

export interface CreatePixResponseDto {
  payment: PaymentDto;
}
