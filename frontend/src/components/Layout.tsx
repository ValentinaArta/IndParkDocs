import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUiStore } from '../stores/uiStore';

export function Layout() {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="flex h-screen">
      {sidebarOpen && <Sidebar />}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
