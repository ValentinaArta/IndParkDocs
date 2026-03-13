import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { NotesPage } from './pages/NotesPage';
import { EntitiesPage } from './pages/EntitiesPage';
import { EntityDetailPage } from './pages/EntityDetailPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { MapPage } from './pages/MapPage';
import { EntityFormPage } from './pages/EntityFormPage';
import { DashboardPage } from './pages/DashboardPage';
import { FinancePage } from './pages/FinancePage';
import { DebtorsPage } from './pages/DebtorsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { RentAnalysisPage } from './pages/RentAnalysisPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { MetersPage } from './pages/MetersPage';
import { LandPlotsPage } from './pages/LandPlotsPage';
import { BuildingsPage } from './pages/BuildingsPage';
import { EquipmentPage } from './pages/EquipmentPage';

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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#c00' }}>
          <h2>Ошибка приложения</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px' }}>Перезагрузить</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
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
            <Route index element={<MapPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="entities/building" element={<BuildingsPage />} />
            <Route path="entities/room" element={<BuildingsPage defaultTab="rooms" />} />
            <Route path="entities/land_plot" element={<LandPlotsPage />} />
            <Route path="entities/equipment" element={<EquipmentPage />} />
            <Route path="entities/meter" element={<MetersPage />} />
            <Route path="entities/:type" element={<EntitiesPage />} />
            <Route path="entities/:type/new" element={<EntityFormPage />} />
            <Route path="entities/:type/:id" element={<EntityDetailPage />} />
            <Route path="entities/:type/:id/edit" element={<EntityFormPage />} />
            <Route path="entities/_/:id" element={<EntityDetailPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="debtors" element={<DebtorsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="rent-analysis" element={<RentAnalysisPage />} />
            <Route path="projects/2vvod" element={<ProjectsPage />} />
            <Route path="reports" element={<PlaceholderPage title="Отчёты" />} />
            <Route path="budget" element={<PlaceholderPage title="Бюджеты" />} />
            <Route path="settings" element={<PlaceholderPage title="Настройки" />} />
            <Route path="*" element={<PlaceholderPage title="Страница" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
