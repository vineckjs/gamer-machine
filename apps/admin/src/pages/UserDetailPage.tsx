import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminUser, Deposit, SessionRecord, addCredit, getActiveOtp, getDeposits, getSessions, getUser, grantBarbershopBonus, updateUser } from '../api';

function fmtMoney(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

export default function UserDetailPage() {
  const { phone: encodedPhone } = useParams<{ phone: string }>();
  const phone = decodeURIComponent(encodedPhone ?? '');
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [otp, setOtp] = useState<{ code: string; expires_at: string } | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  // minutes input for credit (converted to seconds on submit)
  const [minutesInput, setMinutesInput] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Confirmation modal for credit when bonus already granted
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [pendingMinutes, setPendingMinutes] = useState(0);

  // Barbershop bonus
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusError, setBonusError] = useState('');
  const [bonusSuccess, setBonusSuccess] = useState('');

  function loadHistory(p: string) {
    getDeposits(p).then(setDeposits).catch(() => {});
    getSessions(p).then(setSessions).catch(() => {});
  }

  useEffect(() => {
    getUser(phone)
      .then(u => {
        setUser(u);
        setNameInput(u.name ?? '');
        loadHistory(phone);
      })
      .catch(err => {
        if (err.message === 'NOT_FOUND') setNotFound(true);
        else setError(err.message);
      });
  }, [phone]);

  async function handleNameBlur() {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2 || trimmed === (user?.name ?? '')) return;
    setSavingName(true);
    setNameSuccess(false);
    try {
      const updated = await updateUser(phone, trimmed);
      setUser(updated);
      setNotFound(false);
      setNameSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar nome');
    } finally {
      setSavingName(false);
    }
  }

  async function doAddCredit(minutes: number) {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const updated = await addCredit(phone, minutes * 60);
      setUser(updated);
      setNotFound(false);
      loadHistory(phone);
      setSuccess(`${minutes} min adicionados com sucesso!`);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao adicionar crédito');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCredit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const minutes = parseFloat(minutesInput);
    if (isNaN(minutes) || minutes <= 0) { setError('Valor inválido'); return; }

    if (user?.barbershop_bonus_granted) {
      setPendingMinutes(minutes);
      setShowCreditConfirm(true);
    } else {
      await doAddCredit(minutes);
    }
  }

  async function handleConfirmCredit() {
    setShowCreditConfirm(false);
    await doAddCredit(pendingMinutes);
  }

  async function handleGrantBarbershopBonus() {
    setBonusError('');
    setBonusSuccess('');
    if (!hasName) {
      setBonusError('Informe o nome do cliente antes de conceder o bônus.');
      return;
    }
    setBonusLoading(true);
    try {
      const updated = await grantBarbershopBonus(phone);
      setUser(updated);
      setNotFound(false);
      loadHistory(phone);
      setBonusSuccess('Bônus de 5 minutos concedido com sucesso!');
    } catch (err: any) {
      setBonusError(err.message ?? 'Erro ao conceder bônus');
    } finally {
      setBonusLoading(false);
    }
  }

  async function handleFetchOtp() {
    setOtpError('');
    setOtp(null);
    setOtpLoading(true);
    try {
      setOtp(await getActiveOtp(phone));
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setOtpLoading(false);
    }
  }

  const balanceSeconds = user?.balance_seconds ?? 0;
  const hasName = (user?.name ?? nameInput.trim()).length >= 2;

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto">
      {/* Confirmation modal */}
      {showCreditConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-3">⚠️ Atenção</h3>
            <p className="text-gray-700 text-sm mb-6">
              Este usuário já recebeu o bônus do primeiro corte. Este valor deverá ser cobrado do cliente. Deseja prosseguir com a recarga?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreditConfirm(false)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCredit}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-4 py-2 text-sm"
              >
                Sim, prosseguir
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-1 text-sm"
      >
        ← Voltar
      </button>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <p className="text-gray-500 text-sm mb-1">Telefone</p>
        <h2 className="text-xl font-mono font-bold mb-4">{phone}</h2>

        {/* Nome */}
        <div className="mb-6">
          <label className="text-sm text-gray-600 mb-1 block">Nome do cliente</label>
          <input
            type="text"
            placeholder="Nome completo"
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setNameSuccess(false); }}
            onBlur={handleNameBlur}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {savingName && <p className="text-gray-400 text-xs mt-1">Salvando...</p>}
          {nameSuccess && <p className="text-green-600 text-xs mt-1">Nome salvo.</p>}
          {!hasName && !notFound && (
            <p className="text-amber-600 text-xs mt-1">Preencha o nome antes de adicionar crédito.</p>
          )}
        </div>

        <p className="text-gray-500 text-sm mb-1">Saldo atual</p>
        <p className="text-3xl font-bold text-green-600 mb-6">{fmtDuration(balanceSeconds)}</p>

        {notFound && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            Usuário novo — será criado ao adicionar crédito.
          </p>
        )}

        {/* Bônus primeiro corte */}
        <div className="border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">Bônus Primeiro Corte</h3>
          <p className="text-gray-500 text-xs mb-3">Concede 5 minutos gratuitos. Válido apenas uma vez por cliente.</p>
          {bonusSuccess && <p className="text-green-600 text-sm mb-2">{bonusSuccess}</p>}
          {bonusError && <p className="text-red-500 text-sm mb-2">{bonusError}</p>}
          {user?.barbershop_bonus_granted ? (
            <button
              disabled
              className="w-full bg-gray-200 text-gray-500 font-semibold rounded-lg px-4 py-2 text-sm cursor-not-allowed"
            >
              Bônus já concedido ✓
            </button>
          ) : (
            <button
              onClick={handleGrantBarbershopBonus}
              disabled={bonusLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {bonusLoading ? 'Concedendo...' : '🎁 Dar Bônus Primeiro Corte (5 min)'}
            </button>
          )}
        </div>

        {/* Adicionar crédito */}
        <form onSubmit={handleAddCredit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Adicionar tempo (minutos)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={minutesInput}
              onChange={e => setMinutesInput(e.target.value)}
              disabled={!hasName}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button
            type="submit"
            disabled={loading || !hasName}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2 transition-colors"
            title={!hasName ? 'Preencha o nome do cliente primeiro' : undefined}
          >
            {loading ? 'Adicionando...' : 'Adicionar Crédito'}
          </button>
        </form>
      </div>

      {/* Código OTP */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-3">Código de Acesso (OTP)</h3>
        <p className="text-gray-500 text-sm mb-3">
          Gera ou recupera o código ativo para o cliente digitar no kiosk. Expira em 5 minutos.
        </p>
        <button
          onClick={handleFetchOtp}
          disabled={otpLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          {otpLoading ? 'Aguarde...' : 'Ver código de acesso'}
        </button>
        {otp && (
          <div className="mt-4 bg-indigo-50 rounded-xl p-4 text-center">
            <p className="text-4xl font-mono font-bold tracking-widest text-indigo-700">{otp.code}</p>
            <p className="text-xs text-gray-400 mt-2">
              Expira às {new Date(otp.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
        {otpError && <p className="text-amber-600 text-sm mt-3">{otpError}</p>}
      </div>

      {/* Histórico de depósitos */}
      {!notFound && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Histórico de Depósitos</h3>
          {deposits.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum depósito encontrado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {deposits.map(d => (
                <div key={d.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      d.source === 'pix'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {d.source === 'pix' ? 'PIX' : 'Admin'}
                    </span>
                    <span className="text-gray-500">{fmtDate(d.created_at)}</span>
                  </div>
                  <div className="text-right">
                    {d.balance_seconds != null && (
                      <span className="font-semibold text-green-600">+{fmtDuration(d.balance_seconds)}</span>
                    )}
                    {d.source === 'pix' && (
                      <span className="block text-xs text-gray-400">{fmtMoney(d.amount_cents)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Histórico de uso */}
      {!notFound && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="font-bold text-gray-800 mb-3">Histórico de Uso</h3>
          {sessions.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma sessão encontrada.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map(s => (
                <div key={s.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-gray-700">{fmtDate(s.started_at)}</p>
                    <p className="text-gray-400 text-xs">{fmtDuration(s.duration_seconds)}</p>
                  </div>
                  <span className="font-semibold text-red-500">-{fmtDuration(s.duration_seconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
