import { useState, useMemo } from 'react';
import { Topbar } from '../components/Topbar';
import { useRentAnalysis } from '../api/hooks';
import { Loader2, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { fmtMoney } from '../utils/format';

type SortDir = 'asc' | 'desc';

export function RentAnalysisPage() {
  const { data: rows = [], isLoading, error } = useRentAnalysis();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('contractor_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterOrg, setFilterOrg] = useState('');

  const filtered = useMemo(() => {
    let result = [...rows];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        String(r.contractor_name || '').toLowerCase().includes(q) ||
        String(r.contract_number || '').toLowerCase().includes(q) ||
        String(r.building_name || '').toLowerCase().includes(q)
      );
    }
    if (filterOrg) {
      result = result.filter(r => r.our_legal_entity === filterOrg);
    }
    // Sort
    result.sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb), 'ru');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [rows, search, filterOrg, sortKey, sortDir]);

  const totalMonthly = useMemo(() =>
    filtered.reduce((s, r) => s + (Number(r.monthly_total) || 0), 0), [filtered]);

  const orgs = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.our_legal_entity) set.add(r.our_legal_entity as string); });
    return Array.from(set).sort();
  }, [rows]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Анализ аренды" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-5 space-y-5">

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по контрагенту, номеру, корпусу..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Все организации</option>
              {orgs.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div className="ml-auto text-sm text-[var(--text-secondary)]">
              {filtered.length} строк, итого: <span className="font-semibold text-[var(--text-primary)]">{fmtMoney(totalMonthly)}</span>/мес
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Ошибка: {(error as Error).message}
            </div>
          )}

          {!isLoading && (
            <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[var(--text-secondary)] sticky top-0">
                    <tr>
                      {[
                        { key: 'our_legal_entity', label: 'Организация' },
                        { key: 'contractor_name', label: 'Арендатор' },
                        { key: 'contract_number', label: '№ договора' },
                        { key: 'building_name', label: 'Корпус' },
                        { key: 'room_name', label: 'Помещение' },
                        { key: 'area', label: 'Площадь м²' },
                        { key: 'rate', label: 'Ставка руб/м²' },
                        { key: 'monthly_total', label: 'Месяц руб' },
                        { key: 'contract_end_date', label: 'Окончание' },
                      ].map(col => (
                        <th key={col.key}
                          className="px-3 py-2.5 text-left font-medium cursor-pointer hover:text-[var(--primary)] whitespace-nowrap"
                          onClick={() => toggleSort(col.key)}>
                          <div className="flex items-center gap-1">
                            {col.label} <SortIcon col={col.key} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">{r.our_legal_entity as string}</td>
                        <td className="px-3 py-2 font-medium">{r.contractor_name as string}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.contract_number as string}</td>
                        <td className="px-3 py-2">{r.building_name as string || '—'}</td>
                        <td className="px-3 py-2">{r.room_name as string || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(r.area) || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(Number(r.rate) || 0)}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtMoney(Number(r.monthly_total) || 0)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{(r.contract_end_date as string || '').slice(0, 10) || '—'}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-3 py-6 text-center text-[var(--text-secondary)]">Нет данных</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
