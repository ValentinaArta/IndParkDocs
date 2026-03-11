import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { setupFetchMock, mockApiResponses } from '../../test/mocks/api';
import { DebtorsPage } from '../DebtorsPage';

const MOCK_OVERDUE = {
  org: 'test-guid',
  org_name: 'ИПЗ',
  data_as_of: '2026-03-11T12:00:00Z',
  totals: { outstanding: 5000000, debtor_count: 3, invoiced: 8000000, paid: 3000000 },
  aging: { d0: 1000000, d30: 2000000, d60: 1500000, d90: 500000 },
  debtors: [
    {
      key: 'c1', name: 'ООО Рога и Копыта',
      invoiced: 3000000, paid: 1000000, outstanding: 2000000,
      invoice_count: 5, last_invoice_date: '2026-02-15', days_since_last: 24,
      contracts: [
        { contract_num: 'Д-001', invoiced: 2000000, invoice_count: 3, last_date: '2026-02-15' },
        { contract_num: 'Д-002', invoiced: 1000000, invoice_count: 2, last_date: '2026-01-10' },
      ],
      aging: { d0: 500000, d30: 1000000, d60: 500000, d90: 0 },
    },
    {
      key: 'c2', name: 'АО Звезда',
      invoiced: 5000000, paid: 2000000, outstanding: 3000000,
      invoice_count: 8, last_invoice_date: '2026-03-01', days_since_last: 10,
      contracts: [{ contract_num: 'Д-100', invoiced: 5000000, invoice_count: 8, last_date: '2026-03-01' }],
      aging: { d0: 500000, d30: 1000000, d60: 1000000, d90: 500000 },
    },
  ],
};

describe('DebtorsPage', () => {
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

  it('показывает заголовок "Должники"', () => {
    mockApiResponses['/api/finance/overdue'] = MOCK_OVERDUE;
    renderWithProviders(<DebtorsPage />);
    expect(screen.getByText('Должники')).toBeInTheDocument();
  });

  it('показывает VPN-предупреждение при 503', async () => {
    // Override fetch to return 503
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: '1С недоступна' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );

    renderWithProviders(<DebtorsPage />);

    await waitFor(() => {
      expect(screen.getByText(/1С недоступна/i)).toBeInTheDocument();
    });

    globalThis.fetch = origFetch;
  });

  it('рендерит KPI-карточки с данными', async () => {
    mockApiResponses['/api/finance/overdue'] = MOCK_OVERDUE;
    renderWithProviders(<DebtorsPage />);

    await waitFor(() => {
      expect(screen.getByText('Дебиторка (ИПЗ)')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // debtor_count
    });
  });

  it('рендерит таблицу должников', async () => {
    mockApiResponses['/api/finance/overdue'] = MOCK_OVERDUE;
    renderWithProviders(<DebtorsPage />);

    await waitFor(() => {
      expect(screen.getByText('ООО Рога и Копыта')).toBeInTheDocument();
      expect(screen.getByText('АО Звезда')).toBeInTheDocument();
    });
  });

  it('раскрывает drill-down по клику на контрагента', async () => {
    mockApiResponses['/api/finance/overdue'] = MOCK_OVERDUE;
    const user = userEvent.setup();
    renderWithProviders(<DebtorsPage />);

    await waitFor(() => {
      expect(screen.getByText('ООО Рога и Копыта')).toBeInTheDocument();
    });

    // Drill-down contracts not visible initially
    expect(screen.queryByText('Д-001')).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText('ООО Рога и Копыта'));

    await waitFor(() => {
      expect(screen.getByText('Д-001')).toBeInTheDocument();
      expect(screen.getByText('Д-002')).toBeInTheDocument();
    });
  });

  it('показывает структуру aging (4 периода)', async () => {
    mockApiResponses['/api/finance/overdue'] = MOCK_OVERDUE;
    renderWithProviders(<DebtorsPage />);

    await waitFor(() => {
      expect(screen.getByText('0-30 дней')).toBeInTheDocument();
      expect(screen.getByText('30-60 дней')).toBeInTheDocument();
      expect(screen.getByText('60-90 дней')).toBeInTheDocument();
      expect(screen.getByText('90+ дней')).toBeInTheDocument();
    });
  });
});
