import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';

// Reset store state before each test
beforeEach(() => {
  useAppStore.setState({
    screen: 'PHONE_INPUT',
    overlayState: 'HIDDEN',
    phone: '',
    accessToken: null,
    user: null,
    sessionId: null,
    timeRemainingSeconds: 0,
  });
});

describe('appStore', () => {
  describe('setAuth', () => {
    it('sets accessToken, user, and transitions screen to DASHBOARD', () => {
      const user = { id: 'user-1', phone: '11999999999', balance_cents: 500, name: null, email: null, cpf: null, email_verified: false, profile_locked: false };
      useAppStore.getState().setAuth('jwt-token', user);

      const state = useAppStore.getState();
      expect(state.accessToken).toBe('jwt-token');
      expect(state.user).toEqual(user);
      expect(state.screen).toBe('DASHBOARD');
    });
  });

  describe('updateBalance', () => {
    it('updates balance_cents on user and sets timeRemainingSeconds', () => {
      const user = { id: 'user-1', phone: '11999999999', balance_cents: 500, name: null, email: null, cpf: null, email_verified: false, profile_locked: false };
      useAppStore.setState({ user });

      useAppStore.getState().updateBalance(300, 90);

      const state = useAppStore.getState();
      expect(state.user?.balance_cents).toBe(300);
      expect(state.timeRemainingSeconds).toBe(90);
    });

    it('does not crash when user is null', () => {
      useAppStore.getState().updateBalance(300, 90);

      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.timeRemainingSeconds).toBe(90);
    });
  });

  describe('setBalance', () => {
    it('updates only balance_cents without touching timeRemainingSeconds', () => {
      const user = { id: 'user-1', phone: '11999999999', balance_cents: 500, name: null, email: null, cpf: null, email_verified: false, profile_locked: false };
      useAppStore.setState({ user, timeRemainingSeconds: 120 });

      useAppStore.getState().setBalance(1000);

      const state = useAppStore.getState();
      expect(state.user?.balance_cents).toBe(1000);
      expect(state.timeRemainingSeconds).toBe(120); // unchanged
    });

    it('does not crash when user is null', () => {
      useAppStore.getState().setBalance(1000);
      expect(useAppStore.getState().user).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('sets sessionId to null and screen to DASHBOARD', () => {
      useAppStore.setState({ sessionId: 'session-1', screen: 'PLAYING', overlayState: 'WARNING_1MIN' });

      useAppStore.getState().clearSession();

      const state = useAppStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.screen).toBe('DASHBOARD');
      expect(state.overlayState).toBe('HIDDEN');
    });
  });

  describe('logout', () => {
    it('resets entire state to initial values', () => {
      useAppStore.setState({
        screen: 'PLAYING',
        phone: '11999999999',
        accessToken: 'jwt-token',
        user: { id: 'user-1', phone: '11999999999', balance_cents: 500, name: null, email: null, cpf: null, email_verified: false, profile_locked: false },
        sessionId: 'session-1',
        overlayState: 'WARNING_30SEC',
        timeRemainingSeconds: 45,
      });

      useAppStore.getState().logout();

      const state = useAppStore.getState();
      expect(state.screen).toBe('PHONE_INPUT');
      expect(state.phone).toBe('');
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.sessionId).toBeNull();
      expect(state.overlayState).toBe('HIDDEN');
      expect(state.timeRemainingSeconds).toBe(0);
    });
  });
});
