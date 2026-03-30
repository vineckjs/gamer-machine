import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonthlyReport, getMonthlyReport } from '../api';

function brl(cents: number) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}

function prevMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function FinanceiroPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(prevMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getMonthlyReport(month)
      .then(setReport)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);

  const dist = report?.distribuicao;

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-blue-500 transition-colors">
          ← Usuários
        </button>
      </div>

      {/* Seletor de mês */}
      <div className="mb-6">
        <label className="block text-sm text-gray-500 mb-1">Mês de referência</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-gray-400 mb-4">Carregando...</p>}

      {report && !loading && (
        <div className="flex flex-col gap-4">

          {/* Receita PIX */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Receita PIX no mês</p>
            <p className="text-3xl font-black text-green-600">{brl(report.pix_revenue_cents)}</p>
          </div>

          {/* Repasses */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-bold text-gray-700 mb-3">Repasses</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b">
                  <th className="pb-2">Parte</th>
                  <th className="pb-2 text-right">%</th>
                  <th className="pb-2 text-right">Valor</th>
                  <th className="pb-2 text-right">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="py-2">
                  <td className="py-2 font-medium">Investimento / Manutenção</td>
                  <td className="text-right text-gray-500">20%</td>
                  <td className="text-right font-semibold">{brl(dist!.manutencao_cents)}</td>
                  <td className="text-right text-gray-400"></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Barbearia</td>
                  <td className="text-right text-gray-500">20%</td>
                  <td className="text-right font-semibold">{brl(dist!.barbearia_cents)}</td>
                  <td className="text-right text-gray-400"></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Vinicius</td>
                  <td className="text-right text-gray-500">30%</td>
                  <td className="text-right font-semibold">{brl(dist!.vinicius_cents)}</td>
                  <td className="text-right text-gray-400"></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Marcos</td>
                  <td className="text-right text-gray-500">30%</td>
                  <td className="text-right font-semibold">{brl(dist!.marcos_cents)}</td>
                  <td className="text-right text-gray-400"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Créditos Admin */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-bold text-gray-700 mb-3">Créditos adicionados pelo admin</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Total adicionado</p>
                <p className="font-bold">{Math.floor(report.admin_total_seconds / 60)} min</p>
              </div>
              <div className={`rounded-lg p-3 ${report.admin_excess_seconds > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-400 mb-1">Excedente</p>
                <p className={`font-bold ${report.admin_excess_seconds > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {Math.floor(report.admin_excess_seconds / 60)} min
                </p>
              </div>
            </div>
          </div>

          {report.pix_revenue_cents === 0 && (
            <p className="text-center text-gray-400 py-4">Nenhuma receita PIX registrada neste mês.</p>
          )}
        </div>
      )}
    </div>
  );
}
