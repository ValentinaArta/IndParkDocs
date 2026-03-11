import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { useEntities } from '../api/hooks';
import { Search, Loader2, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { fmtDate, fmtMoney } from '../utils/format';
import {
  TYPE_TITLES, STATUS_COLORS, getColumnsForType, ENTITY_ICONS, CONTRACT_TYPES,
} from '../utils/entities';
import type { Entity } from '../api/types';
import type { ColumnDef } from '../utils/entities';

type SortDir = 'asc' | 'desc';

export function EntitiesPage() {
  const { type = 'contract' } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctParam = searchParams.get('ct') || '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState(ctParam);

  // Sync filterType with URL param
  useEffect(() => { setFilterType(ctParam); }, [ctParam]);
  const [filterStatus, setFilterStatus] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Debounced search
  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    searchTimeout[0] = setTimeout(() => setDebouncedSearch(val), 300);
  }, [searchTimeout]);

  const { data: entities = [], isLoading } = useEntities({
    type,
    search: debouncedSearch || undefined,
  });

  const columns = useMemo(() => getColumnsForType(type), [type]);
  const title = TYPE_TITLES[type] || 'Сущности';
  const Icon = ENTITY_ICONS[type];

  // Extract unique values for filters
  const contractTypes = useMemo(() => {
    if (type !== 'contract') return [];
    const set = new Set<string>();
    entities.forEach((e) => {
      const ct = e.effective_contract_type || (e.properties.contract_type as string);
      if (ct) set.add(ct);
    });
    return Array.from(set).sort();
  }, [entities, type]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    entities.forEach((e) => {
      const s = (e.properties.doc_status as string) || (e.properties.status as string);
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [entities]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = entities;

    if (filterType) {
      result = result.filter((e) =>
        (e.effective_contract_type || (e.properties.contract_type as string)) === filterType,
      );
    }
    if (filterStatus) {
      result = result.filter((e) =>
        ((e.properties.doc_status as string) || (e.properties.status as string)) === filterStatus,
      );
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const va = getCellValue(a, sortKey, columns);
        const vb = getCellValue(b, sortKey, columns);
        const cmp = String(va || '').localeCompare(String(vb || ''), 'ru', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [entities, filterType, filterStatus, sortKey, sortDir, columns]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={title}
        actions={
          <button
            onClick={() => navigate(`/entities/${type}/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-dark)] transition"
          >
            <Plus className="w-4 h-4" /> Создать
          </button>
        }
      />

      {/* Filters bar */}
      <div className="px-6 py-3 bg-white border-b border-[var(--border)] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск по названию, номеру..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition"
          />
        </div>

        {type === 'contract' && contractTypes.length > 0 && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">Все типы</option>
            {contractTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {statuses.length > 0 && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">Все статусы</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-[var(--text-secondary)]">
          {filtered.length} из {entities.length}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
            {Icon && <Icon className="w-10 h-10 opacity-20" />}
            <p className="mt-3 text-sm">
              {search ? 'Ничего не найдено' : 'Нет записей'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg)] border-b border-[var(--border)] sticky top-0 z-10">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`
                      px-4 py-3 font-medium text-[var(--text-secondary)] cursor-pointer select-none
                      hover:text-[var(--text)] transition-colors
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                    `}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        sortDir === 'asc'
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entity) => (
                <tr
                  key={entity.id}
                  onClick={() => navigate(`/entities/${type}/${entity.id}`)}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : ''}`}
                    >
                      <CellValue entity={entity} col={col} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---- Cell rendering ----

function getCellValue(entity: Entity, key: string, columns: ColumnDef[]): string {
  const col = columns.find((c) => c.key === key);
  if (!col) return '';

  const props = entity.properties || {};
  switch (key) {
    case 'number': return (props.number as string) || entity.name;
    case 'contractor': return entity.effective_contractor_name || '';
    case 'contract_type': return entity.effective_contract_type || (props.contract_type as string) || '';
    case 'our_legal': return entity.effective_our_legal_entity || '';
    case 'status': return (props.doc_status as string) || (props.status as string) || '';
    case 'amount': return entity.effective_amount || '';
    case 'date': return col.prop ? (props[col.prop] as string) || '' : '';
    case 'name': return entity.name;
    case 'subject': {
      // For rent/sublease — use located_in_names; for others — subject/service_subject
      const rentTypes = ['Аренды', 'Субаренды', 'Аренда оборудования'];
      const ct = (props.contract_type as string) || '';
      if (rentTypes.includes(ct)) return entity.located_in_names || '';
      return (props.service_subject as string) || (props.subject as string) || '';
    }
    default: return col.prop ? (props[col.prop] as string) || '' : '';
  }
}

function CellValue({ entity, col }: { entity: Entity; col: ColumnDef }) {
  const value = getCellValue(entity, col.key, [col]);

  switch (col.render) {
    case 'date':
      return <span className="text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(value)}</span>;

    case 'money': {
      const num = parseFloat(value);
      if (!value || isNaN(num)) return <span className="text-[var(--text-secondary)]">—</span>;
      return <span className="font-medium tabular-nums">{fmtMoney(num)}</span>;
    }

    case 'status': {
      const isVgo = entity.properties.is_vgo === true || entity.properties.is_vgo === 'true';
      return (
        <span className="inline-flex items-center gap-1 flex-wrap">
          {isVgo && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
              ВГО
            </span>
          )}
          {value ? (() => {
            const colors = STATUS_COLORS[value];
            return colors ? (
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {value}
              </span>
            ) : <span className="text-xs">{value}</span>;
          })() : <span className="text-[var(--text-secondary)]">—</span>}
        </span>
      );
    }

    default: {
      // Special: is_own → Да/Нет
      if (col.prop === 'is_own') {
        const v = entity.properties.is_own;
        return <span>{v === true || v === 'true' ? 'Да' : 'Нет'}</span>;
      }

      // For contract list, show number + name differently
      if (col.key === 'number') {
        const num = (entity.properties.number as string) || '';
        return (
          <div>
            <span className="font-medium text-[var(--primary)]">{num || '—'}</span>
          </div>
        );
      }

      if (col.key === 'contractor') {
        return (
          <span className="font-medium">
            {entity.effective_contractor_name || '—'}
          </span>
        );
      }

      if (col.key === 'subject') {
        if (!value) return <span className="text-[var(--text-secondary)]">—</span>;
        const short = value.length > 55 ? value.slice(0, 55) + '…' : value;
        return (
          <span className="text-xs text-[var(--text-secondary)]" title={value}>
            {short}
          </span>
        );
      }

      return <span>{value || '—'}</span>;
    }
  }
}
