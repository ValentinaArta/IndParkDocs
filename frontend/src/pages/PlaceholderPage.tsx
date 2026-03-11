import { Topbar } from '../components/Topbar';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <>
      <Topbar title={title} />
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
        <Construction className="w-12 h-12 opacity-30 mb-3" />
        <p className="text-sm">Эта страница будет перенесена из старого интерфейса</p>
        <a
          href="/"
          className="mt-4 text-sm text-[var(--primary)] hover:underline"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = '/';
          }}
        >
          ← Открыть старый интерфейс
        </a>
      </div>
    </>
  );
}
