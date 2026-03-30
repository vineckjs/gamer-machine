import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { PhoneInputScreen } from './PhoneInputScreen';
import { OtpInputScreen } from './OtpInputScreen';
import { DashboardScreen } from './DashboardScreen';
import { PlayingScreen } from './PlayingScreen';
import { ProfileScreen } from './ProfileScreen';

export function KioskApp() {
  const { screen, setOverlayState, clearSession, updateBalance } = useAppStore();

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onBalanceUpdate((data) => {
      updateBalance(data.balance_seconds, data.time_remaining_seconds);
    });

    window.electronAPI.onWarning((data) => {
      if (data.type === 'WARNING_1MIN') setOverlayState('WARNING_1MIN');
      else if (data.type === 'WARNING_30SEC') setOverlayState('WARNING_30SEC');
      else if (data.type === 'SESSION_ENDED') setOverlayState('SESSION_ENDED');
    });

    window.electronAPI.onSessionEnded(() => {
      clearSession();
    });

    return () => {
      window.electronAPI.removeAllListeners('balance_update');
      window.electronAPI.removeAllListeners('warning');
      window.electronAPI.removeAllListeners('session_ended');
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white">
      {screen === 'PHONE_INPUT' && <PhoneInputScreen />}
      {screen === 'OTP_INPUT' && <OtpInputScreen />}
      {screen === 'DASHBOARD' && <DashboardScreen />}
      {screen === 'PLAYING' && <PlayingScreen />}
      {screen === 'PROFILE' && <ProfileScreen />}
    </div>
  );
}
