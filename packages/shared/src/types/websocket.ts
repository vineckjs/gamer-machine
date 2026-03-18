export interface BalanceUpdatePayload {
  balance_cents: number;
  time_remaining_seconds: number;
  session_id: string;
}

export type WarningType = 'WARNING_1MIN' | 'WARNING_30SEC' | 'SESSION_ENDED';

export interface WarningPayload {
  type: WarningType;
}
