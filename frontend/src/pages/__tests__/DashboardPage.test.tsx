import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { setupFetchMock, mockApiResponses } from '../../test/mocks/api';
import { DashboardPage } from '../DashboardPage';

describe('DashboardPage', () => {
  let cleanup: () => void;

  beforeEach(() => {
    localStorage.setItem('accessToken', 'test-token');
    cleanup = setupFetchMock();
  });

  afterEach(() => {
    cleanup();
    Object.keys(mockApiResponses).forEach(k => delete mockApiResponses[k]);
    localStorage.clear();
  });

  it('показывает заголовок "Обзор"', () => {
    mockApiResponses['/api/stats'] = { types: [], totalRelations: 0 };
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Обзор')).toBeInTheDocument();
  });

  it('показывает спиннер при загрузке', () => {
    // No mock response → loading state
    renderWithProviders(<DashboardPage />);
    // Loader2 renders as svg with animate-spin class
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('рендерит карточки сущностей после загрузки', async () => {
    mockApiResponses['/api/stats'] = {
      types: [
        { name: 'contract', name_ru: 'Договор', icon: 'file-text', color: '#3b82f6', count: 42 },
        { name: 'building', name_ru: 'Корпус', icon: 'building', color: '#f97316', count: 8 },
      ],
      totalRelations: 169,
    };

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Договор')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Корпус')).toBeInTheDocument();
      expect(screen.getByText('169')).toBeInTheDocument();
      expect(screen.getByText('связей')).toBeInTheDocument();
    });
  });

  it('не показывает типы с count=0', async () => {
    mockApiResponses['/api/stats'] = {
      types: [
        { name: 'contract', name_ru: 'Договор', icon: 'file-text', color: '#3b82f6', count: 5 },
        { name: 'cession', name_ru: 'Цессия', icon: 'file', color: '#999', count: 0 },
      ],
      totalRelations: 10,
    };

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Договор')).toBeInTheDocument();
    });

    expect(screen.queryByText('Цессия')).not.toBeInTheDocument();
  });
});
