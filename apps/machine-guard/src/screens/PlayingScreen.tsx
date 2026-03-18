import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function PlayingScreen() {
  const { sessionId, accessToken, clearSession } = useAppStore();

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onSessionEnded(() => {
      clearSession();
    });
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent" />
  );
}
