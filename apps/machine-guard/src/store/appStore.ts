import { create } from 'zustand';

export type Screen = 'PHONE_INPUT' | 'OTP_INPUT' | 'DASHBOARD' | 'PLAYING' | 'PROFILE';
export type OverlayState = 'HIDDEN' | 'WARNING_1MIN' | 'WARNING_30SEC' | 'SESSION_ENDED';

interface UserData {
  id: string;
  phone: string;
  name: string | null;
  balance_seconds: number;
  email: string | null;
  cpf: string | null;
  email_verified: boolean;
  profile_locked: boolean;
}

interface AppState {
  screen: Screen;
  overlayState: OverlayState;
  phone: string;
  accessToken: string | null;
  user: UserData | null;
  sessionId: string | null;
  timeRemainingSeconds: number;

  setPhone: (phone: string) => void;
  setAuth: (token: string, user: UserData) => void;
  setScreen: (screen: Screen) => void;
  updateBalance: (balance_seconds: number, timeRemaining: number) => void;
  setBalance: (balance_seconds: number) => void;
  setSessionId: (id: string | null) => void;
  setOverlayState: (state: OverlayState) => void;
  updateUser: (data: Partial<UserData>) => void;
  clearSession: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'PHONE_INPUT',
  overlayState: 'HIDDEN',
  phone: '',
  accessToken: null,
  user: null,
  sessionId: null,
  timeRemainingSeconds: 0,

  setPhone: (phone) => set({ phone }),
  setAuth: (accessToken, user) => set({ accessToken, user, screen: 'DASHBOARD' }),
  setScreen: (screen) => set({ screen }),
  updateBalance: (balance_seconds, timeRemainingSeconds) =>
    set((s) => ({ user: s.user ? { ...s.user, balance_seconds } : null, timeRemainingSeconds })),
  setBalance: (balance_seconds) =>
    set((s) => ({ user: s.user ? { ...s.user, balance_seconds } : null })),
  setSessionId: (sessionId) => set({ sessionId }),
  setOverlayState: (overlayState) => set({ overlayState }),
  updateUser: (data) =>
    set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),
  clearSession: () => set({ sessionId: null, screen: 'DASHBOARD', overlayState: 'HIDDEN' }),
  logout: () => set({
    screen: 'PHONE_INPUT',
    phone: '',
    accessToken: null,
    user: null,
    sessionId: null,
    overlayState: 'HIDDEN',
    timeRemainingSeconds: 0,
  }),
}));
