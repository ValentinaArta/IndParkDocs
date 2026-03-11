import { Outlet } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useUiStore } from '../stores/uiStore';

export function Layout() {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <div className="flex h-screen">
      {sidebarOpen && <Sidebar />}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute top-4 left-4 z-20 p-2 rounded-lg bg-white border border-[var(--border)] shadow-sm hover:bg-[var(--bg-hover)] transition-colors"
            title="Показать меню"
          >
            <PanelLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        )}
        <Outlet />
      </main>
    </div>
  );
}
