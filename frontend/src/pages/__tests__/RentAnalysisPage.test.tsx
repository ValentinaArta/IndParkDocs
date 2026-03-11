import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { setupFetchMock, mockApiResponses } from '../../test/mocks/api';
import { RentAnalysisPage } from '../RentAnalysisPage';

const MOCK_ROWS = [
  {
    id: 1, name: 'Договор аренды ООО Альфа',
    contract_type: 'Аренды', contract_number: 'А-001',
    contract_date: '2025-06-01', contract_end_date: '2027-06-01',
    our_legal_entity: 'ИПЗ', vat_rate: '20',
    building_name: 'Корпус 1', room_name: 'Офис 101',
    area: 120, rate: 600, monthly_total: 72000,
    contractor_name: 'ООО Альфа', subtenant_name: null,
  },
  {
    id: 2, name: 'Договор аренды ООО Бета',
    contract_type: 'Аренды', contract_number: 'А-002',
    contract_date: '2025-09-01', contract_end_date: '2026-09-01',
    our_legal_entity: 'ЭКЗ', vat_rate: '0',
    building_name: 'Корпус 3', room_name: 'Склад 5',
    area: 500, rate: 200, monthly_total: 100000,
    contractor_name: 'ООО Бета', subtenant_name: null,
  },
];

describe('RentAnalysisPage', () => {
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

  it('показывает заголовок "Анализ аренды"', () => {
    mockApiResponses['/api/reports/rent-analysis'] = MOCK_ROWS;
    renderWithProviders(<RentAnalysisPage />);
    expect(screen.getByText('Анализ аренды')).toBeInTheDocument();
  });

  it('рендерит таблицу с арендаторами', async () => {
    mockApiResponses['/api/reports/rent-analysis'] = MOCK_ROWS;
    renderWithProviders(<RentAnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument();
      expect(screen.getByText('ООО Бета')).toBeInTheDocument();
      expect(screen.getByText('А-001')).toBeInTheDocument();
      expect(screen.getByText('Корпус 1')).toBeInTheDocument();
    });
  });

  it('показывает итоговую сумму', async () => {
    mockApiResponses['/api/reports/rent-analysis'] = MOCK_ROWS;
    renderWithProviders(<RentAnalysisPage />);

    await waitFor(() => {
      // 72000 + 100000 = 172 000
      expect(screen.getByText('2 строк, итого:')).toBeTruthy;
    });
  });

  it('фильтрует по поисковому запросу', async () => {
    mockApiResponses['/api/reports/rent-analysis'] = MOCK_ROWS;
    const user = userEvent.setup();
    renderWithProviders(<RentAnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/поиск/i);
    await user.type(input, 'Бета');

    await waitFor(() => {
      expect(screen.queryByText('ООО Альфа')).not.toBeInTheDocument();
      expect(screen.getByText('ООО Бета')).toBeInTheDocument();
    });
  });

  it('фильтрует по организации', async () => {
    mockApiResponses['/api/reports/rent-analysis'] = MOCK_ROWS;
    const user = userEvent.setup();
    renderWithProviders(<RentAnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue('Все организации');
    await user.selectOptions(select, 'ИПЗ');

    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument();
      expect(screen.queryByText('ООО Бета')).not.toBeInTheDocument();
    });
  });
});
