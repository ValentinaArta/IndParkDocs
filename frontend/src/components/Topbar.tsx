import { Menu } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const { toggleSidebar } = useUiStore();

  return (
    <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-[var(--border)]">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        title="Скрыть/показать меню"
      >
        <Menu className="w-5 h-5 text-[var(--text-secondary)]" />
      </button>
      <h2 className="text-lg font-semibold">{title}</h2>
      {actions && <div className="ml-auto flex gap-2">{actions}</div>}
    </header>
  );
}
