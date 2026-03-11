import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { NotesPage } from './pages/NotesPage';
import { EntitiesPage } from './pages/EntitiesPage';
import { EntityDetailPage } from './pages/EntityDetailPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PlaceholderPage title="Карта" />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="entities/:type" element={<EntitiesPage />} />
            <Route path="entities/:type/:id" element={<EntityDetailPage />} />
            <Route path="entities/_/:id" element={<EntityDetailPage />} />
            <Route path="reports" element={<PlaceholderPage title="Отчёты" />} />
            <Route path="budget" element={<PlaceholderPage title="Бюджеты" />} />
            <Route path="settings" element={<PlaceholderPage title="Настройки" />} />
            <Route path="*" element={<PlaceholderPage title="Страница" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
