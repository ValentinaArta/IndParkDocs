import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { setupFetchMock, mockApiResponses } from '../../test/mocks/api';
import { EntityFormPage } from '../EntityFormPage';

const MOCK_ENTITY_TYPES = [
  { id: 4, name: 'company', name_ru: 'Компания', icon: 'landmark', color: '#10B981', sort_order: 4 },
  { id: 5, name: 'contract', name_ru: 'Договор', icon: 'file-text', color: '#EF4444', sort_order: 5 },
];

const MOCK_FIELDS_COMPANY = [
  { id: 1, name: 'inn', name_ru: 'ИНН', field_type: 'text', required: false, options: [] },
  { id: 2, name: 'is_own', name_ru: 'Наше юр. лицо', field_type: 'boolean', required: false, options: [] },
  { id: 3, name: 'phone', name_ru: 'Телефон', field_type: 'text', required: false, options: [] },
];

const ROUTE_NEW = 'entities/:type/new';
const ROUTE_EDIT = 'entities/:type/:id/edit';

describe('EntityFormPage — создание', () => {
  let cleanup: () => void;

  beforeEach(() => {
    localStorage.setItem('accessToken', 'test-token');
    cleanup = setupFetchMock();
    mockApiResponses['/api/entity-types'] = MOCK_ENTITY_TYPES;
    mockApiResponses['/api/entity-types/4/fields'] = MOCK_FIELDS_COMPANY;
  });

  afterEach(() => {
    cleanup();
    Object.keys(mockApiResponses).forEach(k => delete mockApiResponses[k]);
    localStorage.clear();
  });

  it('показывает поле "Название" обязательное', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/new'],
      route: ROUTE_NEW,
    });

    await waitFor(() => {
      expect(screen.getByText(/Название/)).toBeInTheDocument();
    });
  });

  it('рендерит динамические поля из field_definitions', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/new'],
      route: ROUTE_NEW,
    });

    await waitFor(() => {
      expect(screen.getByText('ИНН')).toBeInTheDocument();
      expect(screen.getByText('Наше юр. лицо')).toBeInTheDocument();
      expect(screen.getByText('Телефон')).toBeInTheDocument();
    });
  });

  it('показывает кнопку "Создать" в режиме создания', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/new'],
      route: ROUTE_NEW,
    });

    await waitFor(() => {
      expect(screen.getByText('Создать')).toBeInTheDocument();
    });
    expect(screen.queryByText('Удалить')).not.toBeInTheDocument();
  });

  it('показывает ошибку при пустом названии', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/new'],
      route: ROUTE_NEW,
    });
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Создать')).toBeInTheDocument();
    });

    const form = screen.getByText('Создать').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Введите название')).toBeInTheDocument();
    });
  });

  it('чекбокс boolean-поля переключается', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/new'],
      route: ROUTE_NEW,
    });
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Наше юр. лицо')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});

describe('EntityFormPage — редактирование', () => {
  let cleanup: () => void;

  beforeEach(() => {
    localStorage.setItem('accessToken', 'test-token');
    cleanup = setupFetchMock();
    mockApiResponses['/api/entity-types'] = MOCK_ENTITY_TYPES;
    mockApiResponses['/api/entity-types/4/fields'] = MOCK_FIELDS_COMPANY;
    mockApiResponses['/api/entities/42'] = {
      id: 42, name: 'ООО Тест', entity_type_id: 4, type_name: 'company',
      properties: { inn: '1234567890', is_own: true, phone: '+7-999-111' },
      parent_id: null, parent_name: null,
    };
  });

  afterEach(() => {
    cleanup();
    Object.keys(mockApiResponses).forEach(k => delete mockApiResponses[k]);
    localStorage.clear();
  });

  it('предзаполняет название из существующей сущности', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/42/edit'],
      route: ROUTE_EDIT,
    });

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('ООО Тест');
      expect(nameInput).toBeInTheDocument();
    });
  });

  it('показывает кнопку "Сохранить" и "Удалить" в режиме редактирования', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/42/edit'],
      route: ROUTE_EDIT,
    });

    await waitFor(() => {
      expect(screen.getByText('Сохранить')).toBeInTheDocument();
      expect(screen.getByText('Удалить')).toBeInTheDocument();
    });
  });

  it('удаление требует подтверждения', async () => {
    renderWithProviders(<EntityFormPage />, {
      initialEntries: ['/entities/company/42/edit'],
      route: ROUTE_EDIT,
    });

    await waitFor(() => {
      expect(screen.getByText('Удалить')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Удалить'));

    await waitFor(() => {
      expect(screen.getByText('Удалить?')).toBeInTheDocument();
      // "Да" button in the confirmation (not the boolean label)
      const daBtn = screen.getByRole('button', { name: 'Да' });
      expect(daBtn).toBeInTheDocument();
      const netBtn = screen.getByRole('button', { name: 'Нет' });
      expect(netBtn).toBeInTheDocument();
    });
  });
});
