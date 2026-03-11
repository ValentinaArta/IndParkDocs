export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = d.substring(0, 10); // 2026-03-11 -> 11.03.2026
  return date.split('-').reverse().join('.');
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU');
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
