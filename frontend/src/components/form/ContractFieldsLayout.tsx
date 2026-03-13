import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowRightLeft, X, Plus, Settings } from 'lucide-react';
import { FieldInput } from './FieldInput';
import { RentObjectsEditor, type RentObject } from './RentObjectsEditor';
import { ALL_OBJECT_TYPES } from './RentObjectButtons';
import { ContractItemsEditor, type ContractItem } from './ContractItemsEditor';
import { DurationSection } from './DurationSection';
import { EntitySearch } from './EntitySearch';
import { useContractTypeFields, useLookup, type ContractTypeField } from '../../api/hooks';
import type { FieldDefinition } from '../../api/types';

/* ---- Section wrapper ---- */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function InheritedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      <div className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-lg">
        {value || '—'} <span className="text-xs italic">(наследуется)</span>
      </div>
    </div>
  );
}

/* ---- VAT options loaded from DB ---- */

interface Props {
  fields: FieldDefinition[];
  properties: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  isEdit?: boolean;
  isSupp?: boolean;
  parentCard?: Record<string, unknown> | null;
  contractId?: number | null;
}

export function ContractFieldsLayout({ fields, properties, onChange, isEdit, isSupp, parentCard, contractId }: Props) {
  const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
  const { data: ctfMap = {} } = useContractTypeFields();
  const { data: vatOptions = ['22', '20', '10', '0'] } = useLookup('vat_rate');

  const contractType = String(properties.contract_type || '');
  const ctFields = ctfMap[contractType] || [];

  // Detect what sections to show based on contract type
  const isRental = contractType === 'Аренды' || contractType === 'Субаренды';
  const isEqRent = contractType === 'Аренда оборудования';
  const hasRentObjects = isRental;
  const hasContractItems = !isRental && !isEqRent;
  const showSubtenant = contractType === 'Субаренды';

  // Parse rent_objects from properties
  const rentObjects: RentObject[] = useMemo(() => {
    const raw = properties.rent_objects;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((r: Record<string, unknown>) => ({
        entity_id: r.entity_id ? Number(r.entity_id) : null,
        entity_name: String(r.entity_name || ''),
        object_type: (String(r.object_type || 'room') as RentObject['object_type']),
        area: String(r.area || ''),
        rent_rate: String(r.rent_rate || ''),
        net_rate: String(r.net_rate || ''),
        utility_rate: String(r.utility_rate || ''),
        calc_mode: (r.calc_mode === 'fixed' ? 'fixed' : 'area_rate') as RentObject['calc_mode'],
        comment: String(r.comment || ''),
        fixed_rent: String(r.fixed_rent || ''),
      }));
    }
    return [];
  }, [properties.rent_objects]);

  // Parse contract_items from properties
  const contractItems: ContractItem[] = useMemo(() => {
    const raw = properties.contract_items;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((r: Record<string, unknown>) => ({
        name: String(r.name || ''),
        unit: String(r.unit || ''),
        quantity: String(r.quantity || ''),
        price: String(r.price || ''),
        amount: String(r.amount || ''),
        charge_type: String(r.charge_type || 'Повторяющийся'),
        frequency: String(r.frequency || 'Ежемесячно'),
        payment_date: String(r.payment_date || ''),
        equipment_ids: Array.isArray(r.equipment_ids) ? r.equipment_ids.map(Number) : [],
        equipment_names: Array.isArray(r.equipment_names) ? r.equipment_names.map(String) : [],
      }));
    }
    return [];
  }, [properties.contract_items]);

  // Calculate rent_monthly from rent_objects
  const calcRentMonthly = useCallback(() => {
    if (!hasRentObjects) return 0;
    let total = 0;
    for (const ro of rentObjects) {
      if (ro.calc_mode === 'fixed') {
        total += parseFloat(ro.fixed_rent || '') || 0;
      } else {
        const area = parseFloat(ro.area) || 0;
        const rate = parseFloat(ro.rent_rate) || 0;
        total += Math.round(area * rate * 100) / 100;
      }
    }
    // Add extra services cost
    const extraCost = parseFloat(String(properties.extra_services_cost || '')) || 0;
    if (properties.extra_services === 'true' || properties.extra_services === true) {
      total += extraCost;
    }
    return total;
  }, [rentObjects, properties.extra_services, properties.extra_services_cost, hasRentObjects]);

  const rentMonthly = calcRentMonthly();

  // Calculate contract_amount from contract_items
  const calcContractAmount = useCallback(() => {
    return contractItems.reduce((sum, it) => {
      if (!it.charge_type || it.charge_type === 'Повторяющийся') {
        return sum + (parseFloat(it.amount) || 0);
      }
      return sum;
    }, 0);
  }, [contractItems]);

  const contractAmount = hasContractItems ? calcContractAmount() : 0;

  // VAT calculation
  const vatRate = parseFloat(String(properties.vat_rate || '22')) || 0;
  const baseAmount = isRental ? rentMonthly : contractAmount;
  const vatAmount = vatRate > 0 ? baseAmount * vatRate / (100 + vatRate) : 0;

  const renderField = (name: string) => {
    const f = byName[name];
    if (!f) return null;
    return <FieldInput key={f.id} field={f} value={properties[f.name]} onChange={onChange} />;
  };

  // Swap our/contractor
  function handleSwap() {
    const ourRole = properties.our_role_label;
    const ourEntity = properties.our_legal_entity;
    const ourId = properties.our_legal_entity_id;
    const contrRole = properties.contractor_role_label;
    const contrEntity = properties.contractor_name;
    const contrId = properties.contractor_id;
    onChange('our_role_label', contrRole || '');
    onChange('our_legal_entity', contrEntity || '');
    onChange('our_legal_entity_id', contrId || '');
    onChange('contractor_role_label', ourRole || '');
    onChange('contractor_name', ourEntity || '');
    onChange('contractor_id', ourId || '');
  }

  // Fields handled in explicit sections
  const sectionFields = new Set([
    'contract_type', 'number', 'contract_date', 'doc_status',
    'our_role_label', 'our_legal_entity', 'our_legal_entity_id', 'contractor_role_label', 'contractor_name', 'contractor_id', 'subtenant_name', 'subtenant_id',
    'vat_rate', 'rent_monthly', 'contract_amount',
    'duration_type', 'duration_date', 'duration_text', 'contract_end_date',
    'extra_services', 'extra_services_desc', 'extra_services_cost',
    'has_power_allocation', 'power_allocation_kw',
    'external_rental', 'rent_comments',
    'rent_objects', 'contract_items', 'equipment_list', 'equipment_rent_items',
    'subject_buildings', 'subject_rooms', 'subject_land_plots', 'subject_land_plot_parts',
  ]);

  // Also exclude fields from CONTRACT_TYPE_FIELDS that we handle
  const ctFieldNames = new Set(ctFields.map((f: ContractTypeField) => f.name));

  const otherFields = fields.filter((f) =>
    !sectionFields.has(f.name) && !ctFieldNames.has(f.name)
  );

  const hasExtraServices = properties.extra_services === 'true' || properties.extra_services === true;
  const hasPower = properties.has_power_allocation === 'true' || properties.has_power_allocation === true;

  return (
    <>
      {/* РЕКВИЗИТЫ */}
      <FormSection title="Реквизиты договора">
        {isSupp && isEdit ? (
          <div className="text-sm px-3 py-2 bg-gray-50 border rounded-lg text-gray-500">
            {contractType || '—'} <span className="text-xs text-gray-400">(наследуется)</span>
          </div>
        ) : (
          renderField('contract_type')
        )}
        <Row2>
          {renderField('number')}
          {renderField('contract_date')}
        </Row2>
        {renderField('doc_status')}
      </FormSection>

      {/* СТОРОНЫ */}
      <FormSection title="Стороны">
        {isSupp ? (
          <div className="space-y-3">
            <Row2>
              <InheritedField label="Роль нашей стороны" value={String(properties.our_role_label || parentCard?.our_role_label || '')} />
              <InheritedField label="Наше юр. лицо" value={String(properties.our_legal_entity || parentCard?.our_legal_entity || '')} />
            </Row2>
            <Row2>
              <InheritedField label="Роль контрагента" value={String(properties.contractor_role_label || parentCard?.contractor_role_label || '')} />
              <InheritedField label="Контрагент" value={String(properties.contractor_name || parentCard?.contractor_name || '')} />
            </Row2>
            {showSubtenant && (properties.subtenant_name || parentCard?.subtenant_name) && (
              <InheritedField label="Субарендатор" value={String(properties.subtenant_name || parentCard?.subtenant_name || '')} />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Row2>
                  {renderField('our_role_label')}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Наше юр. лицо</label>
                    <EntitySearch
                      value={properties.our_legal_entity_id
                        ? { id: Number(properties.our_legal_entity_id), name: String(properties.our_legal_entity || '') }
                        : properties.our_legal_entity
                          ? { id: 0, name: String(properties.our_legal_entity) }
                          : null}
                      onChange={(val) => {
                        onChange('our_legal_entity', val?.name || '');
                        onChange('our_legal_entity_id', val?.id || '');
                      }}
                      entityType="company"
                      filter={(e) => e.properties?.is_own === true || e.properties?.is_own === 'true'}
                      placeholder="Выберите юрлицо..."
                    />
                  </div>
                </Row2>
              </div>
              <button type="button" onClick={handleSwap} title="Поменять местами"
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-600 mb-0.5">
                <ArrowRightLeft size={16} />
              </button>
            </div>
            <Row2>
              {renderField('contractor_role_label')}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Контрагент</label>
                <EntitySearch
                  value={properties.contractor_id
                    ? { id: Number(properties.contractor_id), name: String(properties.contractor_name || '') }
                    : properties.contractor_name
                      ? { id: 0, name: String(properties.contractor_name) }
                      : null}
                  onChange={(val) => {
                    onChange('contractor_name', val?.name || '');
                    onChange('contractor_id', val?.id || '');
                  }}
                  entityType="company"
                  placeholder="Выберите контрагента..."
                />
              </div>
            </Row2>
            {showSubtenant && renderField('subtenant_name')}
          </div>
        )}
      </FormSection>

      {/* ПРЕДМЕТ ДОГОВОРА — always show, even if contractType not yet set */}
      <FormSection title="Предмет договора">
          {hasRentObjects && (
            <RentObjectsEditor
              value={rentObjects}
              onChange={(items) => onChange('rent_objects', items)}
              showHeatingRate={(() => {
                const HEATING_CONTRACT_ID = 121; // Атика №040518
                const cid = contractId || (parentCard?.id ? Number(parentCard.id) : null);
                return cid === HEATING_CONTRACT_ID;
              })()}
            />
          )}
          {hasContractItems && (
            <>
              {/* Subject text for non-rental */}
              {renderField('subject') || (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Предмет договора</label>
                  <input type="text"
                    value={String(properties.subject || '')}
                    onChange={(e) => onChange('subject', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Описание" />
                </div>
              )}
              <ContractItemsEditor
                value={contractItems}
                onChange={(items) => onChange('contract_items', items)}
              />

              {/* Object buttons for non-rental contracts (with meter) */}
              <div className="mt-3">
                <RentObjectsEditor
                  value={rentObjects}
                  onChange={(items) => onChange('rent_objects', items)}
                  types={ALL_OBJECT_TYPES}
                  showHeatingRate={false}
                />
              </div>
            </>
          )}
        </FormSection>

      {/* ОБОРУДОВАНИЕ */}
      <EquipmentSection
        value={(properties.equipment_list as Array<Record<string, unknown>>) || []}
        onChange={(items) => onChange('equipment_list', items)}
      />

      {/* УСЛОВИЯ ОПЛАТЫ */}
      <FormSection title="Условия оплаты">
          {/* Auto-calculated total */}
          {isRental ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Арендная плата в месяц</label>
              <input type="text" readOnly
                value={rentMonthly > 0 ? rentMonthly.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : ''}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-semibold text-blue-600" />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Сумма договора (итого)</label>
              <input type="text" readOnly
                value={contractAmount > 0 ? contractAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : ''}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-semibold text-blue-600" />
            </div>
          )}

          {/* НДС */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">НДС</label>
            <div className="flex items-center gap-3">
              <select value={String(properties.vat_rate || vatOptions[0] || '22')}
                onChange={(e) => onChange('vat_rate', e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm">
                {vatOptions.map((v) => (
                  <option key={v} value={v}>
                    {v === '0' ? '0% (без НДС)' : `${v}%`}
                    {v === vatOptions[0] ? ' (по умолчанию)' : ''}
                  </option>
                ))}
              </select>
              {vatAmount > 0 && baseAmount > 0 && (
                <span className="text-xs text-gray-500">
                  в т.ч. НДС ({vatRate}%) = {vatAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
                </span>
              )}
            </div>
          </div>

          {/* Extra services (rental only) */}
          {isRental && (
            <>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={hasExtraServices}
                  onChange={(e) => onChange('extra_services', String(e.target.checked))}
                  className="w-4 h-4 rounded" />
                Доп. услуги
              </label>
              {hasExtraServices && (
                <div className="pl-6 space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Описание доп. услуг</label>
                    <input type="text" value={String(properties.extra_services_desc || '')}
                      onChange={(e) => onChange('extra_services_desc', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Стоимость в месяц</label>
                    <input type="number" step="0.01" value={String(properties.extra_services_cost || '')}
                      onChange={(e) => onChange('extra_services_cost', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}

              {/* Comments */}
              {renderField('rent_comments') || null}

              {/* Power allocation */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={hasPower}
                  onChange={(e) => onChange('has_power_allocation', String(e.target.checked))}
                  className="w-4 h-4 rounded" />
                Выделена эл. мощность
              </label>
              {hasPower && (
                <div className="pl-6">
                  <label className="block text-xs text-gray-500 mb-1">Эл. мощность (кВт)</label>
                  <input type="number" step="0.1" value={String(properties.power_allocation_kw || '')}
                    onChange={(e) => onChange('power_allocation_kw', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              )}
            </>
          )}

          {/* Duration */}
          <DurationSection
            durationType={String(properties.duration_type || '')}
            durationDate={String(properties.duration_date || properties.contract_end_date || '')}
            durationText={String(properties.duration_text || '')}
            onChange={(name, value) => {
              onChange(name, value);
              if (name === 'duration_date') onChange('contract_end_date', value);
            }}
          />
        </FormSection>

      {/* changes_description — always show for supplements */}
      {otherFields.some(f => f.name === 'changes_description') && (
        <FormSection title="Что изменилось">
          <textarea
            value={(properties.changes_description as string) || ''}
            onChange={(e) => onChange('changes_description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Опишите что изменилось в этом ДС..."
          />
        </FormSection>
      )}

      {/* Остальные поля — не для аренды/субаренды */}
      {!isRental && otherFields.filter(f => f.name !== 'changes_description').length > 0 && (
        <FormSection title="Дополнительно">
          {otherFields.filter(f => f.name !== 'changes_description').map((f) => (
            <FieldInput key={f.id} field={f} value={properties[f.name]} onChange={onChange} />
          ))}
        </FormSection>
      )}
    </>
  );
}

/* ---- Equipment Section ---- */
function EquipmentSection({ value, onChange }: {
  value: Array<Record<string, unknown>>;
  onChange: (items: Array<Record<string, unknown>>) => void;
}) {
  const [adding, setAdding] = useState(false);

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleAdd = (eq: { id: number; name: string; properties?: Record<string, unknown> }) => {
    // Prevent duplicates
    if (value.some((e) => Number(e.equipment_id || e.id) === eq.id)) {
      setAdding(false);
      return;
    }
    onChange([...value, {
      equipment_id: eq.id,
      equipment_name: eq.name,
      inv_number: eq.properties?.inv_number || '',
      equipment_category: eq.properties?.equipment_category || '',
    }]);
    setAdding(false);
  };

  return (
    <FormSection title="Оборудование">
      {value.length === 0 && !adding && (
        <p className="text-sm text-gray-400">Нет оборудования</p>
      )}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((eq, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm group">
              <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium flex-1">{String(eq.equipment_name || eq.name || '—')}</span>
              {(eq.inv_number || eq.inv) && (
                <span className="text-gray-400 text-xs">Инв. {String(eq.inv_number || eq.inv)}</span>
              )}
              {(eq.equipment_category || eq.category) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  {String(eq.equipment_category || eq.category)}
                </span>
              )}
              <button type="button" onClick={() => handleRemove(i)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="mt-2">
          <EntitySearch
            entityType="equipment"
            placeholder="Поиск оборудования..."
            onChange={(eq) => { if (eq) handleAdd(eq as { id: number; name: string; properties?: Record<string, unknown> }); }}
          />
          <button type="button" onClick={() => setAdding(false)}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600">Отмена</button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline">
          <Plus className="w-4 h-4" /> Добавить оборудование
        </button>
      )}
    </FormSection>
  );
}
