import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useEntities } from '../api/hooks';
import {
  Map, FileText, Paperclip, FileCheck, FileSignature, Mail,
  Building2, Landmark, MapPin, Settings as SettingsIcon,
  BarChart2, PieChart, TrendingUp, Box, Sparkles, AlertTriangle, Receipt,
  Zap, Scale, Flame, NotebookPen, LogOut, Shield,
  ChevronDown, ChevronRight, PanelLeftClose, Gauge,
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

function NavGroup({ icon, label, basePath, children }: { icon: ReactNode; label: string; basePath: string; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname.startsWith(basePath);
  const [open, setOpen] = useState(isActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left
          ${isActive ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}
        `}
      >
        <span className="w-4 h-4 flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        {label}
        <span className="ml-auto w-3.5 h-3.5 [&>svg]:w-3.5 [&>svg]:h-3.5 text-white/40">
          {open ? <ChevronDown /> : <ChevronRight />}
        </span>
      </button>
      {open && (
        <div className="ml-2 space-y-0.5 mt-0.5">
          <button
            onClick={() => navigate(basePath)}
            className={`w-full text-left text-xs px-3 py-1.5 pl-7 rounded-lg transition-colors
              ${location.pathname === basePath && !location.search
                ? 'text-white font-medium' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            · все договоры
          </button>
          {children}
        </div>
      )}
    </div>
  );
}

function NavSubItem({ label, path }: { label: string; path: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname + location.search === path;

  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full text-left text-xs px-3 py-1.5 pl-7 rounded-lg transition-colors
        ${active ? 'text-white font-medium' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
    >
      · {label}
    </button>
  );
}

function NavGroupDynamic({ icon, label, basePath, type, allLabel }: { icon: ReactNode; label: string; basePath: string; type: string; allLabel: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname.startsWith(basePath);
  const [open, setOpen] = useState(isActive);
  const { data: entities = [] } = useEntities({ type, enabled: open });

  const sorted = [...entities].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left
          ${isActive ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}
        `}
      >
        <span className="w-4 h-4 flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        {label}
        <span className="ml-auto w-3.5 h-3.5 [&>svg]:w-3.5 [&>svg]:h-3.5 text-white/40">
          {open ? <ChevronDown /> : <ChevronRight />}
        </span>
      </button>
      {open && (
        <div className="ml-2 space-y-0.5 mt-0.5 max-h-[400px] overflow-y-auto">
          <button
            onClick={() => navigate(basePath)}
            className={`w-full text-left text-xs px-3 py-1.5 pl-7 rounded-lg transition-colors
              ${location.pathname === basePath && !location.pathname.match(/\/\d+$/)
                ? 'text-white font-medium' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            · {allLabel}
          </button>
          {sorted.map((e) => {
            const ePath = `${basePath}/${e.id}`;
            const active = location.pathname === ePath || location.pathname === `/entities/_/${e.id}`;
            return (
              <button key={e.id} onClick={() => navigate(ePath)}
                className={`w-full text-left text-xs px-3 py-1.5 pl-7 rounded-lg transition-colors truncate
                  ${active ? 'text-white font-medium' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
              >
                · {e.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { logout } = useAuthStore();

  const { toggleSidebar } = useUiStore();

  return (
    <aside className="w-[260px] min-w-[260px] bg-[var(--bg-sidebar)] text-white flex flex-col h-full">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">IndParkDocs</h1>
          <p className="text-xs text-white/50 mt-1">Документы и связи</p>
        </div>
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Свернуть меню">
          <PanelLeftClose className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <NavItem icon={<Map />} label="Карта" path="/" />

        <NavSection label="Документы" />
        <NavGroup icon={<FileText />} label="Договоры" basePath="/entities/contract">
          <NavSubItem label="Аренды" path="/entities/contract?ct=Аренды" />
          <NavSubItem label="Субаренды" path="/entities/contract?ct=Субаренды" />
          <NavSubItem label="Аренда оборудования" path="/entities/contract?ct=Аренда оборудования" />
          <NavSubItem label="Подряда" path="/entities/contract?ct=Подряда" />
          <NavSubItem label="Услуг" path="/entities/contract?ct=Услуг" />
          <NavSubItem label="Купли-продажи" path="/entities/contract?ct=Купли-продажи" />
          <NavSubItem label="Обслуживания" path="/entities/contract?ct=Обслуживания" />
          <NavSubItem label="Эксплуатации" path="/entities/contract?ct=Электроснабжения" />
        </NavGroup>
        <NavItem icon={<Paperclip />} label="Доп. соглашение" path="/entities/supplement" />
        <NavItem icon={<FileCheck />} label="Акт" path="/entities/act" />
        <NavItem icon={<FileSignature />} label="Приказ" path="/entities/order" />
        <NavItem icon={<Mail />} label="Письма" path="/letters" />

        <NavSection label="Реестры" />
        <NavGroupDynamic icon={<Building2 />} label="Корпуса" basePath="/entities/building" type="building" allLabel="все помещения" />
        <NavItem icon={<Landmark />} label="Компании" path="/entities/company" />
        <NavItem icon={<MapPin />} label="Земельные участки" path="/entities/land_plot" />
        <NavItem icon={<SettingsIcon />} label="Оборудование" path="/entities/equipment" />
        <NavItem icon={<Gauge />} label="Счётчики" path="/entities/meter" />

        <NavSection label="Финансы" />
        <NavItem icon={<TrendingUp />} label="Сводка 1С" path="/finance" />
        <NavItem icon={<AlertTriangle />} label="Должники" path="/debtors" />
        <NavItem icon={<Receipt />} label="Расходы" path="/expenses" />
        <NavItem icon={<TrendingUp />} label="Бюджеты" path="/budget" />

        <NavSection label="Аналитика" />
        <NavItem icon={<BarChart2 />} label="Анализ аренды" path="/rent-analysis" />
        <NavItem icon={<PieChart />} label="Обзор" path="/dashboard" />
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
