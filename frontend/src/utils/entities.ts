import {
  FileText, Paperclip, FileCheck, FileSignature,
  Building2, Landmark, MapPin, Settings, Mail, Box,
} from 'lucide-react';
import type { ComponentType } from 'react';

// Entity type → Lucide icon mapping
export const ENTITY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  contract: FileText,
  supplement: Paperclip,
  act: FileCheck,
  order: FileSignature,
  document: FileText,
  building: Building2,
  company: Landmark,
  land_plot: MapPin,
  equipment: Settings,
  room: Box,
  letter: Mail,
};

// Entity type → CSS dot color
export const TYPE_COLORS: Record<string, string> = {
  contract: '#EF4444',
  supplement: '#F59E0B',
  act: '#6366F1',
  order: '#8B5CF6',
  document: '#64748B',
  building: '#6366F1',
  company: '#10B981',
  land_plot: '#22C55E',
  equipment: '#64748B',
  room: '#A78BFA',
};

// Contract status badge colors
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Подписан': { bg: '#DCFCE7', text: '#166534' },
  'Действующий': { bg: '#DCFCE7', text: '#166534' },
  'На согласовании': { bg: '#FEF9C3', text: '#854D0E' },
  'Проект': { bg: '#DBEAFE', text: '#1E40AF' },
  'Расторгнут': { bg: '#FEE2E2', text: '#991B1B' },
  'Истёк': { bg: '#F3F4F6', text: '#6B7280' },
};

// Contract type labels for filter
export const CONTRACT_TYPES = [
  'Аренды',
  'Субаренды',
  'Услуг',
  'Обслуживания',
  'Работ',
  'Подряда',
  'Поставки',
  'Агентский',
  'Прочее',
];

// Payment status
export const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Оплачивается ежемесячно': { bg: '#DCFCE7', text: '#166534' },
  'Задолженность': { bg: '#FEE2E2', text: '#991B1B' },
  'Оплачен полностью': { bg: '#DBEAFE', text: '#1E40AF' },
};

// Column configs per entity type
export interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  render?: 'date' | 'money' | 'status' | 'text';
  prop?: string; // properties key
}

const contractColumns: ColumnDef[] = [
  { key: 'number', label: '№', width: '120px', prop: 'number' },
  { key: 'contractor', label: 'Контрагент', width: '1fr' },
  { key: 'contract_type', label: 'Тип', width: '120px' },
  { key: 'our_legal', label: 'Юрлицо', width: '180px' },
  { key: 'status', label: 'Статус', width: '120px', render: 'status' },
  { key: 'amount', label: 'Сумма', width: '130px', align: 'right', render: 'money' },
  { key: 'date', label: 'Дата', width: '100px', render: 'date', prop: 'contract_date' },
];

const companyColumns: ColumnDef[] = [
  { key: 'name', label: 'Название', width: '1fr' },
  { key: 'inn', label: 'ИНН', width: '140px', prop: 'inn' },
  { key: 'is_own', label: 'Наша', width: '80px', prop: 'is_own' },
];

const buildingColumns: ColumnDef[] = [
  { key: 'name', label: 'Название', width: '1fr' },
  { key: 'short_name', label: 'Сокращение', width: '120px', prop: 'short_name' },
  { key: 'area', label: 'Площадь', width: '120px', align: 'right', prop: 'area' },
];

const equipmentColumns: ColumnDef[] = [
  { key: 'name', label: 'Название', width: '1fr' },
  { key: 'category', label: 'Категория', width: '180px', prop: 'equipment_category' },
  { key: 'inv_number', label: 'Инв. №', width: '120px', prop: 'inv_number' },
  { key: 'status', label: 'Статус', width: '120px', render: 'status', prop: 'status' },
];

const defaultColumns: ColumnDef[] = [
  { key: 'name', label: 'Название', width: '1fr' },
  { key: 'status', label: 'Статус', width: '120px', render: 'status', prop: 'doc_status' },
  { key: 'date', label: 'Дата', width: '100px', render: 'date', prop: 'contract_date' },
];

export function getColumnsForType(type: string): ColumnDef[] {
  switch (type) {
    case 'contract': return contractColumns;
    case 'company': return companyColumns;
    case 'building': return buildingColumns;
    case 'equipment': return equipmentColumns;
    default: return defaultColumns;
  }
}

// Title mapping
export const TYPE_TITLES: Record<string, string> = {
  contract: 'Договоры',
  supplement: 'Доп. соглашения',
  act: 'Акты',
  order: 'Приказы',
  document: 'Документы',
  building: 'Корпуса',
  company: 'Компании',
  land_plot: 'Земельные участки',
  equipment: 'Оборудование',
  room: 'Помещения',
};
