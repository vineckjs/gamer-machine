import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { NumericKeypad } from '../components/NumericKeypad';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type Stage = 'editing' | 'verifying_email' | 'complete';

function formatCPF(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function ProfileScreen() {
  const { user, accessToken, setScreen, updateUser, setBalance } = useAppStore();

  const [stage, setStage] = useState<Stage>(
    user?.profile_locked ? 'complete' : 'editing',
  );

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [cpf, setCpf] = useState(formatCPF(user?.cpf ?? ''));

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name, email, cpf }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar');
      updateUser({
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        email_verified: data.email_verified,
        profile_locked: data.profile_locked,
      });
      if (data.emailChanged) {
        setOtpCode('');
        setStage('verifying_email');
      }
    } catch (e: any) {
      setError(Array.isArray(e.message) ? e.message.join(', ') : (e.message ?? 'Erro ao salvar'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError('');
    try {
      await fetch(`${API_URL}/users/me/email/send-verification`, {
        method: 'POST',
        headers: authHeader,
      });
      setOtpCode('');
    } catch {
      setError('Erro ao reenviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otpCode.length !== 6) { setError('Digite os 6 dígitos'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/users/me/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.message ?? 'Código inválido');
      updateUser({
        email_verified: data.email_verified,
        profile_locked: data.profile_locked,
        balance_cents: data.balance_cents,
      });
      setBalance(data.balance_cents);
      setStage('complete');
    } catch (e: any) {
      setError(e.message ?? 'Código inválido');
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpKey = (key: string) => {
    if (key === '*' || key === '#') return;
    if (otpCode.length < 6) setOtpCode((c) => c + key);
  };

  if (stage === 'verifying_email') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <button
          onClick={() => setStage('editing')}
          className="absolute top-4 left-4 text-gray-500 hover:text-gray-300 text-sm"
        >
          ← Voltar
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-neon-green mb-2">VERIFICAR EMAIL</h2>
          <p className="text-gray-400">Enviamos um código para</p>
          <p className="text-white font-semibold">{email}</p>
        </div>

        <div className="flex gap-3 mb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-12 h-14 flex items-center justify-center text-2xl font-bold border-2 rounded-lg bg-gray-900"
              style={{ borderColor: otpCode[i] ? '#39FF14' : '#374151' }}
            >
              {otpCode[i] ?? ''}
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 mt-1 text-sm">{error}</p>}

        <NumericKeypad
          onKey={handleOtpKey}
          onDelete={() => setOtpCode((c) => c.slice(0, -1))}
          onSubmit={handleVerify}
        />

        <button
          onClick={handleResendVerification}
          disabled={loading}
          className="mt-4 text-gray-500 text-sm underline disabled:opacity-50"
        >
          Reenviar código
        </button>

        {loading && <p className="mt-2 text-neon-blue text-sm">Verificando...</p>}
      </div>
    );
  }

  if (stage === 'complete') {
    const bonusGranted = user?.profile_locked;
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-3xl font-black text-neon-green mb-3">
          {bonusGranted ? 'Perfil Verificado!' : 'Email Confirmado!'}
        </h2>
        {bonusGranted && (
          <p className="text-white text-lg mb-2">R$10 adicionados ao seu saldo!</p>
        )}
        <p className="text-gray-400 mb-8">
          Seus dados estão salvos e o perfil está bloqueado.<br />
          Para alterações, fale com o atendimento.
        </p>
        <button
          onClick={() => setScreen('DASHBOARD')}
          className="px-8 py-3 rounded-xl bg-neon-green text-black font-black text-lg hover:opacity-90 transition-opacity"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  // Stage: editing
  const isLocked = user?.profile_locked ?? false;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <button
        onClick={() => setScreen('DASHBOARD')}
        className="absolute top-4 left-4 text-gray-500 hover:text-gray-300 text-sm"
      >
        ← Voltar
      </button>

      <h2 className="text-3xl font-black text-neon-green mb-2">PERFIL</h2>

      {isLocked && (
        <p className="text-orange-400 text-sm mb-4 text-center">
          Perfil verificado — para alterações, fale com o atendimento.
        </p>
      )}

      {!isLocked && (
        <p className="text-gray-400 text-sm mb-6 text-center">
          Complete seu perfil e ganhe <span className="text-neon-green font-bold">R$10</span> de bônus!
        </p>
      )}

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div>
          <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wide">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={isLocked}
            placeholder="Seu nome completo"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-neon-green disabled:opacity-60"
            style={isLocked ? { cursor: 'default' } : {}}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wide">CPF</label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            readOnly={isLocked}
            placeholder="000.000.000-00"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-neon-green font-mono"
            style={isLocked ? { cursor: 'default' } : {}}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wide">
            Email
            {user?.email_verified && (
              <span className="ml-2 text-neon-green normal-case">✓ verificado</span>
            )}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={isLocked}
            placeholder="seu@email.com"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-neon-green"
            style={isLocked ? { cursor: 'default' } : {}}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {!isLocked && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-neon-green text-black font-black text-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
          >
            {loading ? 'Salvando...' : 'Salvar e verificar email'}
          </button>
        )}

        {!isLocked && user?.email && !user.email_verified && (
          <button
            onClick={() => setStage('verifying_email')}
            className="w-full py-2 text-sm text-gray-400 underline"
          >
            Já tenho um código → verificar email
          </button>
        )}
      </div>
    </div>
  );
}
