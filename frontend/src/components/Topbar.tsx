interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  return (
    <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-[var(--border)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      {actions && <div className="ml-auto flex gap-2">{actions}</div>}
    </header>
  );
}
