const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface AdminUser {
  id: string;
  phone: string;
  name: string | null;
  balance_seconds: number;
  barbershop_bonus_granted: boolean;
  created_at: string;
}

export interface Deposit {
  id: string;
  amount_cents: number;
  balance_seconds: number | null;
  source: 'pix' | 'admin';
  created_at: string;
}

export interface SessionRecord {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  cost_cents: number;
}

/**
 * Normaliza um número para o formato E.164 brasileiro (+55DDNNNNNNNNN).
 * Remove tudo que não for dígito, adiciona 55 se não tiver, adiciona +.
 * Retorna null se o resultado tiver menos de 12 dígitos (55 + DDD + mínimo 8).
 */
export function formatBrazilianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : '55' + digits;
  if (withCountry.length < 12) return null; // precisa de pelo menos 55 + DDD (2) + 8 dígitos
  return '+' + withCountry;
}

const TOKEN_KEY = 'admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminLogin(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Credenciais inválidas');
  const data = await res.json();
  return data.access_token;
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: authHeaders(),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error('Erro ao buscar usuários');
  return res.json();
}

export async function getUser(phone: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(phone)}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (!res.ok) throw new Error('Erro ao buscar usuário');
  return res.json();
}

export async function updateUser(phone: string, name: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(phone)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error('Erro ao salvar nome');
  return res.json();
}

export async function addCredit(phone: string, balanceSeconds: number): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(phone)}/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ balance_seconds: balanceSeconds }),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error('Erro ao adicionar crédito');
  return res.json();
}

export async function grantBarbershopBonus(phone: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(phone)}/barbershop-bonus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).message ?? 'Erro ao conceder bônus');
  }
  return res.json();
}

export async function getActiveOtp(phone: string): Promise<{ code: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(phone)}/otp`, {
    headers: authHeaders(),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (!res.ok) throw new Error('Erro ao buscar código');
  return res.json();
}

export async function getDeposits(phone: string): Promise<Deposit[]> {
  const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(phone)}/deposits`, {
    headers: authHeaders(),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error('Erro ao buscar depósitos');
  return res.json();
}

export interface ExcessDetail {
  user_phone: string;
  user_name: string | null;
  semana: string;
  total_seconds: number;
  bonus_seconds: number;
  excesso_seconds: number;
}

export interface MonthlyReport {
  month: string;
  pix_revenue_cents: number;
  admin_total_seconds: number;
  admin_excess_seconds: number;
  distribuicao: {
    manutencao_cents: number;
    barbearia_cents: number;
    vinicius_cents: number;
    marcos_cents: number;
  };
  excess_details: ExcessDetail[];
}

export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const res = await fetch(`${API_URL}/admin/financeiro/mensal?month=${encodeURIComponent(month)}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error('Erro ao buscar relatório');
  return res.json();
}

export async function getSessions(phone: string): Promise<SessionRecord[]> {
  const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(phone)}/sessions`, {
    headers: authHeaders(),
  });
  if (res.status === 401) { clearToken(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error('Erro ao buscar sessões');
  return res.json();
}
