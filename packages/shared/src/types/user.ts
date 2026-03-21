export interface UserDto {
  id: string;
  phone: string;
  name: string | null;
  balance_cents: number;
  created_at: string;
}
