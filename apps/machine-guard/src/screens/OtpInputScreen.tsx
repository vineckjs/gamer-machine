import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { NumericKeypad } from '../components/NumericKeypad';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function OtpInputScreen() {
  const { phone, setAuth, setScreen } = useAppStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKey = (key: string) => {
    if (key === '*' || key === '#') return;
    if (code.length < 6) setCode((c) => c + key);
  };

  const handleDelete = () => setCode((c) => c.slice(0, -1));

  const handleSubmit = async () => {
    if (code.length !== 6) { setError('Digite os 6 dígitos'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.message ?? 'Código inválido');
      setAuth(data.access_token, data.user);
    } catch (e: any) {
      setError(e.message ?? 'Código inválido');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setCountdown(300);
      setCode('');
      setError('');
    } catch { setError('Erro ao reenviar'); }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black text-neon-green mb-2">CÓDIGO SMS</h2>
        <p className="text-gray-400">Enviado para {phone}</p>
      </div>

      <div className="flex gap-3 mb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-12 h-14 flex items-center justify-center text-2xl font-bold border-2 rounded-lg bg-gray-900"
            style={{ borderColor: code[i] ? '#39FF14' : '#374151' }}
          >
            {code[i] ?? ''}
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 mt-1 text-sm">{error}</p>}

      <p className="text-gray-500 text-sm mt-2">
        Expira em {minutes}:{seconds.toString().padStart(2, '0')}
      </p>

      <NumericKeypad onKey={handleKey} onDelete={handleDelete} onSubmit={handleSubmit} />

      <div className="mt-4 flex gap-4">
        {countdown === 0 && (
          <button onClick={handleResend} className="text-neon-blue underline text-sm">
            Reenviar código
          </button>
        )}
        <button onClick={() => setScreen('PHONE_INPUT')} className="text-gray-500 text-sm underline">
          Voltar
        </button>
      </div>

      {loading && <p className="mt-4 text-neon-blue">Verificando...</p>}
    </div>
  );
}
