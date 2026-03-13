import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { ResizableTable, type Column } from '../components/ResizableTable';
import { useEntities } from '../api/hooks';
import { Search, Loader2, Plus, Settings } from 'lucide-react';
import type { Entity } from '../api/types';

const EQ_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'В работе': { bg: '#DCFCE7', text: '#166534' },
  'На ремонте': { bg: '#FEF9C3', text: '#854D0E' },
  'Законсервировано': { bg: '#E0E7FF', text: '#3730A3' },
  'Списано': { bg: '#FEE2E2', text: '#991B1B' },
};

export function EquipmentPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');

  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    searchTimeout[0] = setTimeout(() => setDebouncedSearch(val), 300);
  }, [searchTimeout]);

  const { data: entities = [], isLoading } = useEntities({
    type: 'equipment',
    search: debouncedSearch || undefined,
  });

  // Unique filter values
  const owners = useMemo(() => {
    const set = new Set<string>();
    entities.forEach((e) => { const v = e.properties.balance_owner_name as string; if (v) set.add(v); });
    return Array.from(set).sort();
  }, [entities]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    entities.forEach((e) => { const v = e.properties.equipment_category as string; if (v) set.add(v); });
    return Array.from(set).sort();
  }, [entities]);

  const buildings = useMemo(() => {
    const set = new Set<string>();
    entities.forEach((e) => { if (e.parent_name) set.add(e.parent_name); });
    return Array.from(set).sort();
  }, [entities]);

  // Filter
  const filtered = useMemo(() => {
    let result = entities;
    if (filterOwner) result = result.filter((e) => (e.properties.balance_owner_name as string) === filterOwner);
    if (filterCategory) result = result.filter((e) => (e.properties.equipment_category as string) === filterCategory);
    if (filterBuilding) result = result.filter((e) => e.parent_name === filterBuilding);
    return result;
  }, [entities, filterOwner, filterCategory, filterBuilding]);

  const columns: Column<Entity>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Название',
      minWidth: 200,
      defaultWidth: 300,
      wrap: true,
      render: (e) => <span className="font-medium">{e.name}</span>,
      getValue: (e) => e.name,
    },
    {
      key: 'category',
      label: 'Категория',
      minWidth: 120,
      defaultWidth: 180,
      wrap: true,
      getValue: (e) => (e.properties.equipment_category as string) || '',
    },
    {
      key: 'inv_number',
      label: 'Инв. №',
      minWidth: 80,
      defaultWidth: 110,
      getValue: (e) => (e.properties.inv_number as string) || '',
    },
    {
      key: 'building',
      label: 'Корпус',
      minWidth: 100,
      defaultWidth: 160,
      wrap: true,
      getValue: (e) => e.parent_name || '',
    },
    {
      key: 'owner',
      label: 'Собственник',
      minWidth: 120,
      defaultWidth: 200,
      wrap: true,
      getValue: (e) => (e.properties.balance_owner_name as string) || '',
    },
    {
      key: 'status',
      label: 'Статус',
      minWidth: 90,
      defaultWidth: 120,
      getValue: (e) => (e.properties.status as string) || '',
      render: (e) => {
        const s = (e.properties.status as string) || '';
        if (!s) return <span className="text-[var(--text-muted)]">—</span>;
        const c = EQ_STATUS_COLORS[s] || { bg: '#F3F4F6', text: '#6B7280' };
        return (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
            {s}
          </span>
        );
      },
    },
  ], []);

  const hasFilters = filterOwner || filterCategory || filterBuilding;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Оборудование"
        actions={
          <button
            onClick={() => navigate('/entities/equipment/new')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-dark)] transition"
          >
            <Plus className="w-4 h-4" /> Создать
          </button>
        }
      />

      {/* Filters */}
      <div className="px-6 py-3 bg-white border-b border-[var(--border)] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition"
          />
        </div>

        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white focus:outline-none focus:border-[var(--primary)]">
          <option value="">Все собственники</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>

        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white focus:outline-none focus:border-[var(--primary)]">
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white focus:outline-none focus:border-[var(--primary)]">
          <option value="">Все корпуса</option>
          {buildings.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <span className="text-xs text-[var(--text-secondary)]">
          {filtered.length} из {entities.length}
        </span>

        {hasFilters && (
          <button onClick={() => { setFilterOwner(''); setFilterCategory(''); setFilterBuilding(''); }}
            className="text-xs text-[var(--primary)] hover:underline">
            сбросить
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <ResizableTable
          columns={columns}
          data={filtered}
          getRowKey={(e) => e.id}
          onRowClick={(e) => navigate(`/entities/equipment/${e.id}`)}
          search={search}
          storageKey="equipment-list"
        />
      )}
    </div>
  );
}
