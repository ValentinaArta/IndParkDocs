import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
  initialEntries?: string[];
}

function TestWrapper({ children, initialEntries = ['/'] }: WrapperProps) {
  const qc = createTestQueryClient();
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { initialEntries?: string[] },
) {
  const { initialEntries, ...renderOpts } = options || {};
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={initialEntries}>{children}</TestWrapper>
    ),
    ...renderOpts,
  });
}
