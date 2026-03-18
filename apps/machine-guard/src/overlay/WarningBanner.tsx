type WarningType = 'WARNING_1MIN' | 'WARNING_30SEC' | 'SESSION_ENDED';

interface WarningBannerProps {
  type: WarningType;
  timeRemaining: number;
}

const MESSAGES: Record<WarningType, { text: string; color: string }> = {
  WARNING_1MIN: { text: '⚠️ Menos de 1 minuto de saldo!', color: '#FFAA00' },
  WARNING_30SEC: { text: '🚨 30 segundos restantes!', color: '#FF4444' },
  SESSION_ENDED: { text: '🛑 Sessão encerrada. Recarregue o saldo.', color: '#FF0000' },
};

export function WarningBanner({ type, timeRemaining }: WarningBannerProps) {
  const msg = MESSAGES[type];

  return (
    <div
      className="fixed top-0 left-0 right-0 py-4 px-8 text-center text-white text-2xl font-black pointer-events-none"
      style={{ backgroundColor: msg.color + 'DD', backdropFilter: 'blur(4px)' }}
    >
      {msg.text}
      {type !== 'SESSION_ENDED' && timeRemaining > 0 && (
        <span className="ml-4 text-xl">({timeRemaining}s)</span>
      )}
    </div>
  );
}
