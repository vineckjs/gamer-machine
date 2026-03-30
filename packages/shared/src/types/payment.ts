export type PaymentStatus = 'pending' | 'paid' | 'expired';

export interface Package {
  id: string;
  label: string;
  price_cents: number;
  balance_seconds: number;
  minutes: number;
}

export const PACKAGES: Package[] = [
  { id: 'pack_5min',  label: 'R$10 — 5 min',  price_cents: 1000,  balance_seconds: 300,  minutes: 5  },
  { id: 'pack_15min', label: 'R$20 — 15 min', price_cents: 2000,  balance_seconds: 900,  minutes: 15 },
  { id: 'pack_35min', label: 'R$40 — 35 min', price_cents: 4000,  balance_seconds: 2100, minutes: 35 },
  { id: 'pack_60min', label: 'R$60 — 60 min', price_cents: 6000,  balance_seconds: 3600, minutes: 60 },
];

export interface PaymentDto {
  id: string;
  user_id: string;
  amount_cents: number;
  balance_seconds?: number;
  status: PaymentStatus;
  qr_code?: string;
  qr_code_text?: string;
  created_at: string;
}

export interface CreatePixDto {
  package_id: string;
}

export interface CreatePixResponseDto {
  payment: PaymentDto;
}
