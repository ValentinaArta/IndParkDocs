import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { ResizableTable, type Column } from '../components/ResizableTable';
import { useEntities } from '../api/hooks';
import { Search, Loader2, Plus } from 'lucide-react';
import { fmtDate, fmtMoney } from '../utils/format';
import {
  TYPE_TITLES, STATUS_COLORS, getColumnsForType, ENTITY_ICONS,
} from '../utils/entities';
import type { Entity } from '../api/types';
import type { ColumnDef } from '../utils/entities';

export function EntitiesPage() {
  const { type = 'contract' } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctParam = searchParams.get('ct') || '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState(ctParam);
  useEffect(() => { setFilterType(ctParam); }, [ctParam]);
  const [filterStatus, setFilterStatus] = useState('');

  // Debounce for backend search
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

  const colDefs = useMemo(() => getColumnsForType(type), [type]);
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

  // Apply dropdown filters (type + status)
  const preFiltered = useMemo(() => {
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
    return result;
  }, [entities, filterType, filterStatus]);

  // Build ResizableTable columns from entity ColumnDefs
  const tableColumns: Column<Entity>[] = useMemo(() => {
    return colDefs.map((col) => ({
      key: col.key,
      label: col.label,
      align: col.align as 'left' | 'right' | undefined,
      wrap: col.wrap,
      minWidth: 60,
      defaultWidth: getDefaultWidth(col),
      getValue: (entity: Entity) => getCellValue(entity, col),
      render: (entity: Entity) => <CellValue entity={entity} col={col} />,
    }));
  }, [colDefs]);

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
            placeholder="Поиск по всем полям..."
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
            {contractTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {statuses.length > 0 && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">Все статусы</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <span className="text-xs text-[var(--text-secondary)]">
          {preFiltered.length} из {entities.length}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <ResizableTable
          columns={tableColumns}
          data={preFiltered}
          getRowKey={(e) => e.id}
          onRowClick={(e) => navigate(`/entities/${type}/${e.id}`)}
          search={search}
          storageKey={`entities-${type}`}
        />
      )}
    </div>
  );
}

// ---- Helpers ----

function getDefaultWidth(col: ColumnDef): number | undefined {
  switch (col.key) {
    case 'number': return 120;
    case 'contractor': return 220;
    case 'subject': return 200;
    case 'status': return 110;
    case 'amount': return 140;
    case 'date': return 110;
    case 'contract_type': return 140;
    case 'name': return 250;
    default: return undefined;
  }
}

function getCellValue(entity: Entity, col: ColumnDef): string {
  const props = entity.properties || {};
  switch (col.key) {
    case 'number': return (props.number as string) || entity.name;
    case 'contractor': return entity.effective_contractor_name || '';
    case 'contract_type': return entity.effective_contract_type || (props.contract_type as string) || '';
    case 'our_legal': return entity.effective_our_legal_entity || '';
    case 'status': return (props.doc_status as string) || (props.status as string) || '';
    case 'amount': return entity.effective_amount || '';
    case 'date': return col.prop ? (props[col.prop] as string) || '' : '';
    case 'name': return entity.name;
    case 'subject': {
      const rentTypes = ['Аренды', 'Субаренды', 'Аренда оборудования'];
      const ct = (props.contract_type as string) || '';
      if (rentTypes.includes(ct)) return entity.located_in_names || '';
      return (props.service_subject as string) || (props.subject as string) || '';
    }
    default: return col.prop ? (props[col.prop] as string) || '' : '';
  }
}

function CellValue({ entity, col }: { entity: Entity; col: ColumnDef }) {
  const value = getCellValue(entity, col);

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
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">ВГО</span>
          )}
          {value ? (() => {
            const colors = STATUS_COLORS[value];
            return colors ? (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                style={{ backgroundColor: colors.bg, color: colors.text }}>
                {value}
              </span>
            ) : <span className="text-xs">{value}</span>;
          })() : <span className="text-[var(--text-secondary)]">—</span>}
        </span>
      );
    }
    default: {
      if (col.prop === 'is_own') {
        const v = entity.properties.is_own;
        return <span>{v === true || v === 'true' ? 'Да' : 'Нет'}</span>;
      }
      if (col.key === 'number') {
        const num = (entity.properties.number as string) || '';
        return <span className="font-medium text-[var(--primary)]">{num || '—'}</span>;
      }
      if (col.key === 'contractor') {
        return <span className="font-medium">{entity.effective_contractor_name || '—'}</span>;
      }
      if (col.key === 'subject') {
        if (!value) return <span className="text-[var(--text-secondary)]">—</span>;
        const short = value.length > 55 ? value.slice(0, 55) + '…' : value;
        return <span className="text-xs text-[var(--text-secondary)]" title={value}>{short}</span>;
      }
      return <span>{value || '—'}</span>;
    }
  }
}
