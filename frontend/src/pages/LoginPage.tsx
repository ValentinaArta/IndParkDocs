import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const { login, loading, error, totpRequired } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(username, password, totpRequired ? totp : undefined);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-[360px] max-w-[90vw]"
      >
        <h2 className="text-xl font-bold mb-1">IndParkDocs</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Документы и связи
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Логин</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition"
          />
        </div>

        {totpRequired && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Код 2FA</label>
            <input
              type="text"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition"
              autoFocus
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--red)] mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition disabled:opacity-50"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
