import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  Map, FileText, Paperclip, FileCheck, FileSignature, Mail,
  Building2, Landmark, MapPin, Settings as SettingsIcon,
  BarChart2, PieChart, TrendingUp, Box, Sparkles,
  Zap, Scale, Flame, NotebookPen, LogOut, Shield,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface NavItemProps {
  icon: ReactNode;
  label: string;
  path: string;
  indent?: boolean;
}

function NavItem({ icon, label, path, indent }: NavItemProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname === path;

  return (
    <button
      onClick={() => navigate(path)}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left
        ${indent ? 'pl-7' : ''}
        ${active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/70 hover:bg-white/5 hover:text-white'}
      `}
    >
      <span className="w-4 h-4 flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      {label}
    </button>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mt-4 mb-1 px-3">
      {label}
    </div>
  );
}

export function Sidebar() {
  const { logout } = useAuthStore();

  return (
    <aside className="w-[260px] min-w-[260px] bg-[var(--bg-sidebar)] text-white flex flex-col h-full">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-lg font-bold">IndParkDocs</h1>
        <p className="text-xs text-white/50 mt-1">Документы и связи</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <NavItem icon={<Map />} label="Карта" path="/" />

        <NavSection label="Документы" />
        <NavItem icon={<FileText />} label="Договоры" path="/entities/contract" />
        <NavItem icon={<Paperclip />} label="Доп. соглашение" path="/entities/supplement" />
        <NavItem icon={<FileCheck />} label="Акт" path="/entities/act" />
        <NavItem icon={<FileSignature />} label="Приказ" path="/entities/order" />
        <NavItem icon={<Mail />} label="Письма" path="/letters" />

        <NavSection label="Реестры" />
        <NavItem icon={<Building2 />} label="Корпуса" path="/entities/building" />
        <NavItem icon={<Landmark />} label="Компании" path="/entities/company" />
        <NavItem icon={<MapPin />} label="Земельные участки" path="/entities/land_plot" />
        <NavItem icon={<SettingsIcon />} label="Оборудование" path="/entities/equipment" />

        <NavSection label="Аналитика" />
        <NavItem icon={<BarChart2 />} label="Отчёты" path="/reports" />
        <NavItem icon={<PieChart />} label="BI-дашборды" path="/bi" />
        <NavItem icon={<TrendingUp />} label="Бюджеты" path="/budget" />
        <NavItem icon={<Box />} label="Куб" path="/cube" />
        <NavItem icon={<Sparkles />} label="AI Песочница" path="/ai" />

        <NavSection label="Проекты" />
        <NavItem icon={<Zap />} label="2й ввод" path="/projects/2vvod" />
        <NavItem icon={<Scale />} label="Зачёты с ПАО" path="/legal" />
        <NavItem icon={<Flame />} label="Пожарка" path="/fire-safety" />

        <NavItem icon={<NotebookPen />} label="Заметки" path="/notes" />

        <NavSection label="Настройки" />
        <NavItem icon={<SettingsIcon />} label="Типы и поля" path="/settings" />
        <NavItem icon={<Shield />} label="2FA" path="/totp" />
      </nav>

      <div className="p-2 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Выход
        </button>
      </div>
    </aside>
  );
}
