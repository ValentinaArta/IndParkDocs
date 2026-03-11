import { useState } from 'react';
import { Topbar } from '../components/Topbar';
import { useFinanceExpenses } from '../api/hooks';
import { Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { fmtMoney } from '../utils/format';

const MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

interface ContractorData {
  name: string; contracts: string; total: number;
  monthly: number[];
  contractBreakdown: Array<{ contract_num: string; monthly: number[]; total: number }>;
}

function ContractorRow({ c, cfo }: { c: ContractorData; cfo: string }) {
  const [open, setOpen] = useState(false);
  void cfo; // used implicitly in context
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(!open)}>
        <td className="px-3 py-2 sticky left-0 bg-inherit">
          <div className="flex items-center gap-1.5">
            {c.contractBreakdown.length > 1 ? (
              open ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />
            ) : <span className="w-3" />}
            <span className="text-sm font-medium truncate max-w-[200px]" title={c.name}>{c.name}</span>
          </div>
        </td>
        {c.monthly.map((v, i) => (
          <td key={i} className="px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap">
            {v > 0 ? fmtMoney(v) : ''}
          </td>
        ))}
        <td className="px-3 py-2 text-right font-semibold text-sm">{fmtMoney(c.total)}</td>
      </tr>
      {open && c.contractBreakdown.map((cb, i) => (
        <tr key={i} className="bg-gray-50 text-xs">
          <td className="px-3 py-1.5 pl-8 text-[var(--text-secondary)] sticky left-0 bg-gray-50">{cb.contract_num}</td>
          {cb.monthly.map((v, j) => (
            <td key={j} className="px-2 py-1.5 text-right tabular-nums">{v > 0 ? fmtMoney(v) : ''}</td>
          ))}
          <td className="px-3 py-1.5 text-right font-medium">{fmtMoney(cb.total)}</td>
        </tr>
      ))}
    </>
  );
}

export function ExpensesPage() {
  const [tab, setTab] = useState<'ИП' | 'ЭК'>('ИП');
  const { data, isLoading, error } = useFinanceExpenses();

  const is503 = error && (error as { status?: number }).status === 503;
  const kpi = (data?.kpi as Record<string, Record<string, number>> || {})[tab] || {};
  const contractors = ((data?.contractors as Record<string, ContractorData[]>) || {})[tab] || [];

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Расходы" actions={
        <div className="flex gap-1">
          {(['ИП', 'ЭК'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === t
                ? 'bg-[var(--primary)] text-white'
                : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'}`}>
              {t === 'ИП' ? 'ИПЗ' : 'ЭКЗ'}
            </button>
          ))}
        </div>
      } />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-5 space-y-5">

          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}
          {is503 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="text-amber-600 shrink-0" size={20} />
              <span className="text-sm text-amber-800">1С недоступна (VPN?)</span>
            </div>
          )}

          {data && (
            <>
              {/* KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Факт YTD</div>
                  <div className="text-xl font-bold">{fmtMoney(kpi.fact_ytd || 0)}</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">План YTD</div>
                  <div className="text-xl font-bold text-[var(--text-secondary)]">{fmtMoney(kpi.plan_ytd || 0)}</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">План год</div>
                  <div className="text-xl font-bold text-[var(--text-secondary)]">{fmtMoney(kpi.plan_year || 0)}</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Прогноз</div>
                  <div className="text-xl font-bold text-blue-600">{fmtMoney(kpi.forecast || 0)}</div>
                </div>
              </div>

              {/* Contractors table */}
              <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[var(--text-secondary)] sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium sticky left-0 bg-gray-50">Контрагент</th>
                        {MONTHS.map(m => (
                          <th key={m} className="px-2 py-2.5 text-right font-medium text-xs">{m}</th>
                        ))}
                        <th className="px-3 py-2.5 text-right font-medium">Итого</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {contractors.map((c, i) => (
                        <ContractorRow key={i} c={c} cfo={tab} />
                      ))}
                      {contractors.length === 0 && (
                        <tr><td colSpan={14} className="px-3 py-6 text-center text-[var(--text-secondary)]">Нет данных</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
