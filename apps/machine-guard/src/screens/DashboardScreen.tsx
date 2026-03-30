import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/appStore';
import { QrCodeModal } from '../components/QrCodeModal';
import { PACKAGES } from '@gamer-machine/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s}s`;
}

export function DashboardScreen() {
  const { user, accessToken, setScreen, setSessionId, setBalance, logout } = useAppStore();
  const profileIncomplete = !user?.profile_locked;
  const [qrData, setQrData] = useState<{ qrCodeText: string; packageLabel: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${API_URL}/sessions`, { auth: { token: accessToken } });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join'));
    socket.on('payment_confirmed', (data: { balance_seconds: number }) => {
      setBalance(data.balance_seconds);
      setQrData(null);
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [accessToken]);

  const balanceSeconds = user?.balance_seconds ?? 0;

  const handleTopUp = async (packageId: string) => {
    if (!accessToken) return;
    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payments/create-pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ package_id: packageId }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.message ?? 'Erro ao criar PIX');
      setQrData({ qrCodeText: data.payment.qr_code_text, packageLabel: pkg.label });
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar PIX');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!accessToken || !user || user.balance_seconds <= 0) {
      setError('Saldo insuficiente');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await window.electronAPI.sessionStart(accessToken);
      setSessionId(result.sessionId);
      setScreen('PLAYING');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao iniciar sessão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 relative">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <button
          onClick={() => setScreen('PROFILE')}
          className="relative px-4 py-2 text-sm font-semibold text-gray-200 border border-gray-600 rounded-lg bg-gray-900/60 hover:border-gray-400 hover:text-white transition-all"
        >
          Perfil
          {profileIncomplete && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-400" />
          )}
        </button>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-semibold text-gray-200 border border-gray-600 rounded-lg bg-gray-900/60 hover:border-gray-400 hover:text-white transition-all"
        >
          Sair
        </button>
      </div>
      <h2 className="text-3xl font-black text-neon-green mb-1">DASHBOARD</h2>
      {user?.name && (
        <p className="text-white text-lg font-semibold mb-1">{user.name}</p>
      )}
      <p className="text-gray-400 mb-8">{user?.phone}</p>

      <div className="text-5xl font-black text-neon-green mb-8">
        {formatTime(balanceSeconds)}
      </div>

      <p className="text-gray-400 mb-4">Recarregar saldo</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => handleTopUp(pkg.id)}
            disabled={loading}
            className="py-3 px-2 rounded-xl bg-gray-800 hover:bg-gray-700 font-bold transition-colors disabled:opacity-50 text-sm leading-tight"
          >
            <span className="block text-neon-green">{pkg.minutes} min</span>
            <span className="block text-gray-400 text-xs">R${(pkg.price_cents / 100).toFixed(0)}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

      <button
        onClick={handlePlay}
        disabled={loading || !user || user.balance_seconds <= 0}
        className="w-full max-w-xs py-5 rounded-2xl bg-neon-green text-black text-2xl font-black hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
      >
        🎮 JOGAR
      </button>

      {qrData && (
        <QrCodeModal
          qrCodeText={qrData.qrCodeText}
          packageLabel={qrData.packageLabel}
          onClose={() => setQrData(null)}
        />
      )}
    </div>
  );
}
