import { useState } from 'react';
import { Topbar } from '../components/Topbar';
import { useFinanceSummary } from '../api/hooks';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Receipt, FileText } from 'lucide-react';
import { fmtMoney } from '../utils/format';

function KpiCard({ label, ipz, ekz, icon: Icon, color }: {
  label: string; ipz: number; ekz: number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={color} />
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-[var(--text-secondary)]">ИПЗ</span>
          <span className="text-lg font-semibold">{fmtMoney(ipz)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-[var(--text-secondary)]">ЭКЗ</span>
          <span className="text-lg font-semibold">{fmtMoney(ekz)}</span>
        </div>
      </div>
    </div>
  );
}

export function FinancePage() {
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, error } = useFinanceSummary(dateFrom, dateTo);

  const totals = (data?.totals || {}) as Record<string, { ipz: number; ekz: number }>;
  const recentPayments = (data?.recent_payments || []) as Array<Record<string, unknown>>;
  const recentInvoices = (data?.recent_invoices || []) as Array<Record<string, unknown>>;
  const dataAsOf = data?.data_as_of as string;

  const is503 = error && (error as { status?: number }).status === 503;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Финансы (1С)" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-5 space-y-5">

          {/* Period selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-[var(--text-secondary)]">Период с</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm" />
            <label className="text-sm text-[var(--text-secondary)]">по</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm" />
            {dataAsOf && (
              <span className="text-xs text-[var(--text-secondary)] ml-auto">
                Данные: {new Date(dataAsOf).toLocaleString('ru-RU')}
              </span>
            )}
          </div>

          {/* Loading / Error */}
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}
          {is503 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="text-amber-600 shrink-0" size={20} />
              <div>
                <div className="text-sm font-medium text-amber-800">1С недоступна</div>
                <div className="text-xs text-amber-600">Проверьте VPN-подключение</div>
              </div>
            </div>
          )}
          {error && !is503 && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Ошибка: {(error as Error).message}
            </div>
          )}

          {/* KPI Cards */}
          {data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Поступления" ipz={totals.incoming?.ipz || 0} ekz={totals.incoming?.ekz || 0}
                  icon={TrendingUp} color="text-green-600" />
                <KpiCard label="Списания" ipz={totals.outgoing?.ipz || 0} ekz={totals.outgoing?.ekz || 0}
                  icon={TrendingDown} color="text-red-500" />
                <KpiCard label="Реализация" ipz={totals.revenue?.ipz || 0} ekz={totals.revenue?.ekz || 0}
                  icon={Receipt} color="text-blue-600" />
                <KpiCard label="Счета" ipz={totals.invoices?.ipz || 0} ekz={totals.invoices?.ekz || 0}
                  icon={FileText} color="text-purple-600" />
              </div>

              {/* Recent payments + invoices tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Payments */}
                <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-gray-50">
                    <h3 className="text-sm font-semibold">Последние поступления</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-[var(--text-secondary)] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Дата</th>
                          <th className="px-3 py-2 text-left font-medium">Орг</th>
                          <th className="px-3 py-2 text-right font-medium">Сумма</th>
                          <th className="px-3 py-2 text-left font-medium">Назначение</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {recentPayments.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">{p.date as string}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{p.org as string}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmtMoney(p.amount as number)}</td>
                            <td className="px-3 py-2 text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{p.note as string}</td>
                          </tr>
                        ))}
                        {recentPayments.length === 0 && (
                          <tr><td colSpan={4} className="px-3 py-4 text-center text-[var(--text-secondary)]">Нет данных</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoices */}
                <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-gray-50">
                    <h3 className="text-sm font-semibold">Последние счета</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-[var(--text-secondary)] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Дата</th>
                          <th className="px-3 py-2 text-left font-medium">Номер</th>
                          <th className="px-3 py-2 text-left font-medium">Орг</th>
                          <th className="px-3 py-2 text-right font-medium">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {recentInvoices.map((inv, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">{inv.date as string}</td>
                            <td className="px-3 py-2">{inv.number as string}</td>
                            <td className="px-3 py-2">{inv.org as string}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmtMoney(inv.amount as number)}</td>
                          </tr>
                        ))}
                        {recentInvoices.length === 0 && (
                          <tr><td colSpan={4} className="px-3 py-4 text-center text-[var(--text-secondary)]">Нет данных</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
