import { useEffect, useState } from 'react';
import { WarningBanner } from './WarningBanner';

type WarningType = 'WARNING_1MIN' | 'WARNING_30SEC' | 'SESSION_ENDED' | null;

export function OverlayApp() {
  const [warning, setWarning] = useState<WarningType>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onBalanceUpdate((data) => {
      setTimeRemaining(data.time_remaining_seconds);
    });

    window.electronAPI.onWarning((data) => {
      setWarning(data.type);
      if (data.type === 'SESSION_ENDED') return;
      setTimeout(() => setWarning(null), 10000);
    });

    return () => {
      window.electronAPI.removeAllListeners('balance_update');
      window.electronAPI.removeAllListeners('warning');
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent pointer-events-none">
      {warning && <WarningBanner type={warning} timeRemaining={timeRemaining} />}
    </div>
  );
}
