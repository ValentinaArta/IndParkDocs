import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  minWidth?: number;
  defaultWidth?: number;
  getValue: (row: T) => string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  search?: string;
  /** Optional persistent key for localStorage column widths */
  storageKey?: string;
}

export function ResizableTable<T>({
  columns, data, getRowKey, onRowClick, search, storageKey,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`table-widths-${storageKey}`);
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    const w: Record<string, number> = {};
    columns.forEach((c) => { if (c.defaultWidth) w[c.key] = c.defaultWidth; });
    return w;
  });

  // Persist widths
  useEffect(() => {
    if (storageKey && Object.keys(colWidths).length > 0) {
      localStorage.setItem(`table-widths-${storageKey}`, JSON.stringify(colWidths));
    }
  }, [colWidths, storageKey]);

  // Filter by search across all columns
  const filtered = useFilterBySearch(data, columns, search);

  // Sort
  const sorted = useSortedData(filtered, columns, sortKey, sortDir);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-[var(--bg)] border-b border-[var(--border)] sticky top-0 z-10">
            {columns.map((col) => (
              <ResizableTh
                key={col.key}
                col={col}
                width={colWidths[col.key]}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={() => toggleSort(col.key)}
                onResize={(w) => setColWidths((prev) => ({ ...prev, [col.key]: w }))}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--text-secondary)]">
                {search ? 'Ничего не найдено' : 'Нет записей'}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-[var(--border)] transition-colors ${
                  onRowClick ? 'hover:bg-[var(--bg-hover)] cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                    }`}
                    style={colWidths[col.key] ? { width: colWidths[col.key] } : undefined}
                  >
                    {col.render ? col.render(row) : (col.getValue(row) || '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Resizable TH ---- */
function ResizableTh<T>({ col, width, sortKey, sortDir, onSort, onResize }: {
  col: Column<T>;
  width?: number;
  sortKey: string;
  sortDir: SortDir;
  onSort: () => void;
  onResize: (w: number) => void;
}) {
  const thRef = useRef<HTMLTableCellElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = thRef.current?.offsetWidth || 100;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const diff = ev.clientX - startX.current;
      const newW = Math.max(col.minWidth || 50, startW.current + diff);
      onResize(newW);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [col.minWidth, onResize]);

  const isSorted = sortKey === col.key;

  return (
    <th
      ref={thRef}
      className={`relative px-4 py-3 font-medium text-[var(--text-secondary)] select-none group ${
        col.align === 'right' ? 'text-right' : ''
      }`}
      style={width ? { width } : col.defaultWidth ? { width: col.defaultWidth } : undefined}
    >
      <span
        onClick={onSort}
        className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text)] transition-colors"
      >
        {col.label}
        {isSorted ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </span>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--primary)] opacity-0 group-hover:opacity-30 transition-opacity"
      />
    </th>
  );
}

/* ---- Filter by search across all visible columns ---- */
function useFilterBySearch<T>(data: T[], columns: Column<T>[], search?: string): T[] {
  if (!search || search.length < 2) return data;
  const q = search.toLowerCase();
  return data.filter((row) =>
    columns.some((col) => {
      const val = col.getValue(row);
      return val && val.toLowerCase().includes(q);
    }),
  );
}

/* ---- Sort hook ---- */
function useSortedData<T>(data: T[], columns: Column<T>[], sortKey: string, sortDir: SortDir): T[] {
  if (!sortKey) return data;
  const col = columns.find((c) => c.key === sortKey);
  if (!col) return data;
  return [...data].sort((a, b) => {
    const va = col.getValue(a);
    const vb = col.getValue(b);
    const cmp = String(va || '').localeCompare(String(vb || ''), 'ru', { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

export { useFilterBySearch };
