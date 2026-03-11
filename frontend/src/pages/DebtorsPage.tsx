import { useState } from 'react';
import { Topbar } from '../components/Topbar';
import { useFinanceOverdue } from '../api/hooks';
import { Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { fmtMoney } from '../utils/format';

interface Debtor {
  key: string; name: string;
  invoiced: number; paid: number; outstanding: number;
  invoice_count: number; last_invoice_date: string; days_since_last: number;
  contracts: Array<{ contract_num: string; invoiced: number; invoice_count: number; last_date: string }>;
  aging: { d0: number; d30: number; d60: number; d90: number };
}

function AgingBar({ aging }: { aging: Debtor['aging'] }) {
  const total = aging.d0 + aging.d30 + aging.d60 + aging.d90;
  if (total === 0) return null;
  const segments = [
    { val: aging.d0, color: '#22c55e', label: '0-30д' },
    { val: aging.d30, color: '#eab308', label: '30-60д' },
    { val: aging.d60, color: '#f97316', label: '60-90д' },
    { val: aging.d90, color: '#ef4444', label: '90+д' },
  ];
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100" title={
      segments.map(s => `${s.label}: ${fmtMoney(s.val)}`).join(' | ')
    }>
      {segments.map((s, i) => s.val > 0 ? (
        <div key={i} style={{ width: `${(s.val / total) * 100}%`, backgroundColor: s.color }} />
      ) : null)}
    </div>
  );
}

function DebtorRow({ d }: { d: Debtor }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(!open)}>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            <span className="font-medium text-sm">{d.name}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right font-semibold text-red-600">{fmtMoney(d.outstanding)}</td>
        <td className="px-3 py-2.5 text-right text-sm">{fmtMoney(d.invoiced)}</td>
        <td className="px-3 py-2.5 text-right text-sm text-green-600">{fmtMoney(d.paid)}</td>
        <td className="px-3 py-2.5 text-center text-sm">{d.invoice_count}</td>
        <td className="px-3 py-2.5 text-sm whitespace-nowrap">{d.last_invoice_date || '—'}</td>
        <td className="px-3 py-2.5 w-32"><AgingBar aging={d.aging} /></td>
      </tr>
      {open && d.contracts.length > 0 && (
        <tr>
          <td colSpan={7} className="px-8 py-2 bg-gray-50">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-secondary)]">
                  <th className="text-left py-1 font-medium">Договор</th>
                  <th className="text-right py-1 font-medium">Начислено</th>
                  <th className="text-center py-1 font-medium">Актов</th>
                  <th className="text-left py-1 font-medium">Последний</th>
                </tr>
              </thead>
              <tbody>
                {d.contracts.map((c, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="py-1">{c.contract_num}</td>
                    <td className="py-1 text-right">{fmtMoney(c.invoiced)}</td>
                    <td className="py-1 text-center">{c.invoice_count}</td>
                    <td className="py-1">{c.last_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export function DebtorsPage() {
  const [org, setOrg] = useState<string | undefined>(undefined);
  const { data, isLoading, error } = useFinanceOverdue(org);

  const is503 = error && (error as { status?: number }).status === 503;
  const debtors = (data?.debtors || []) as Debtor[];
  const totals = (data?.totals || {}) as Record<string, number>;
  const aging = (data?.aging || {}) as Record<string, number>;
  const orgName = (data?.org_name || 'ИПЗ') as string;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Должники" actions={
        <select value={org || ''} onChange={(e) => setOrg(e.target.value || undefined)}
          className="px-3 py-1.5 border rounded-lg text-sm">
          <option value="">ИПЗ (по умолчанию)</option>
          <option value="6bf16c76-8993-11e8-b18d-001e67301201">ЭКЗ</option>
        </select>
      } />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-5 space-y-5">

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
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Дебиторка ({orgName})</div>
                  <div className="text-xl font-bold text-red-600">{fmtMoney(totals.outstanding || 0)}</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Должников</div>
                  <div className="text-xl font-bold">{totals.debtor_count || 0}</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Начислено</div>
                  <div className="text-xl font-bold">{fmtMoney(totals.invoiced || 0)}</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Оплачено</div>
                  <div className="text-xl font-bold text-green-600">{fmtMoney(totals.paid || 0)}</div>
                </div>
              </div>

              {/* Aging summary */}
              <div className="bg-white rounded-xl border border-[var(--border)] p-4">
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Структура задолженности</div>
                <div className="grid grid-cols-4 gap-4 text-center text-sm">
                  <div><div className="text-green-600 font-bold">{fmtMoney(aging.d0 || 0)}</div><div className="text-xs text-[var(--text-secondary)]">0-30 дней</div></div>
                  <div><div className="text-yellow-600 font-bold">{fmtMoney(aging.d30 || 0)}</div><div className="text-xs text-[var(--text-secondary)]">30-60 дней</div></div>
                  <div><div className="text-orange-600 font-bold">{fmtMoney(aging.d60 || 0)}</div><div className="text-xs text-[var(--text-secondary)]">60-90 дней</div></div>
                  <div><div className="text-red-600 font-bold">{fmtMoney(aging.d90 || 0)}</div><div className="text-xs text-[var(--text-secondary)]">90+ дней</div></div>
                </div>
              </div>

              {/* Debtors table */}
              <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[var(--text-secondary)] sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium">Контрагент</th>
                        <th className="px-3 py-2.5 text-right font-medium">Долг</th>
                        <th className="px-3 py-2.5 text-right font-medium">Начислено</th>
                        <th className="px-3 py-2.5 text-right font-medium">Оплачено</th>
                        <th className="px-3 py-2.5 text-center font-medium">Актов</th>
                        <th className="px-3 py-2.5 text-left font-medium">Последний</th>
                        <th className="px-3 py-2.5 text-left font-medium">Aging</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {debtors.map((d) => <DebtorRow key={d.key} d={d} />)}
                      {debtors.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-6 text-center text-[var(--text-secondary)]">Нет должников</td></tr>
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
