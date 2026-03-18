import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { NumericKeypad } from '../components/NumericKeypad';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function PhoneInputScreen() {
  const { setPhone, setScreen } = useAppStore();
  const [phone, setLocalPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleKey = (key: string) => {
    if (key === '*' || key === '#') return;
    if (phone.length < 15) setLocalPhone((p) => p + key);
  };

  const handleDelete = () => setLocalPhone((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { setError('Digite um telefone válido'); return; }

    const formatted = `+55${cleaned}`;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted }),
      });
      if (!res.ok) throw new Error('Erro ao enviar SMS');
      setPhone(formatted);
      setScreen('OTP_INPUT');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao enviar SMS');
    } finally {
      setLoading(false);
    }
  };

  const display = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-neon-green mb-2">GAMER MACHINE</h1>
        <p className="text-gray-400">Insira seu número de telefone</p>
      </div>

      <div className="w-full max-w-xs bg-gray-900 rounded-2xl p-4 text-center text-2xl font-mono min-h-[3rem]">
        {display || <span className="text-gray-600">DDD + Número</span>}
      </div>

      {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}

      <NumericKeypad onKey={handleKey} onDelete={handleDelete} onSubmit={handleSubmit} />

      {loading && <p className="mt-4 text-neon-blue">Enviando SMS...</p>}
    </div>
  );
}
