import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useEntities } from '../../api/hooks';

interface Props {
  value: { id: number; name: string } | null;
  onChange: (val: { id: number; name: string } | null) => void;
  entityType?: string;
  placeholder?: string;
  filter?: (e: { id: number; name: string; properties: Record<string, unknown> }) => boolean;
}

export function EntitySearch({ value, onChange, entityType, placeholder = 'Поиск...', filter }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { data: entities = [] } = useEntities({ type: entityType, enabled: open });

  const filtered = entities
    .filter((e: Record<string, unknown>) => !filter || filter(e as { id: number; name: string; properties: Record<string, unknown> }))
    .filter((e: Record<string, unknown>) =>
      !query || (e.name as string).toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 30);

  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50">
        <span className="flex-1 text-sm truncate">{value.name}</span>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-300">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 text-sm outline-none bg-transparent"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-white border rounded-lg shadow-lg">
          {filtered.map((e: Record<string, unknown>) => (
            <button
              key={e.id as number}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 truncate"
              onClick={() => { onChange({ id: e.id as number, name: e.name as string }); setOpen(false); setQuery(''); }}
            >
              {e.name as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
