export interface SessionDto {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  cost_cents?: number;
}

export interface StartSessionResponseDto {
  session: SessionDto;
}

export interface EndSessionResponseDto {
  session: SessionDto;
  cost_cents: number;
  duration_seconds: number;
}
