import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { useStats } from '../api/hooks';
import { Loader2, Link } from 'lucide-react';
import { ENTITY_ICONS, TYPE_COLORS } from '../utils/entities';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useStats();

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Обзор" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Ошибка загрузки: {(error as Error).message}
            </div>
          )}
          {stats && (
            <>
              {/* Entity type cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {stats.types
                  .filter((t) => t.count > 0)
                  .map((t) => {
                    const Icon = ENTITY_ICONS[t.name];
                    const color = TYPE_COLORS[t.name] || '#6B7280';
                    return (
                      <button
                        key={t.name}
                        onClick={() => navigate(`/entities/${t.name}`)}
                        className="bg-white rounded-xl border border-[var(--border)] p-4 hover:shadow-md transition text-left group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {Icon && <Icon className="w-5 h-5" style={{ color }} />}
                          <span className="text-2xl font-bold" style={{ color }}>
                            {t.count}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                          {t.name_ru}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Relations count */}
              <div className="inline-flex items-center gap-2 bg-white rounded-xl border border-[var(--border)] px-5 py-3">
                <Link className="w-5 h-5 text-[var(--primary)]" />
                <span className="text-xl font-bold text-[var(--primary)]">{stats.totalRelations}</span>
                <span className="text-sm text-[var(--text-secondary)]">связей</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
