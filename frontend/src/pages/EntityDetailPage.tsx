import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { useEntity, useContractCard, useAdvanceStatus, useWorkHistory } from '../api/hooks';
import { apiGet } from '../api/client';
import {
  ArrowLeft, Loader2, Paperclip, FileCheck,
  CreditCard, Settings, ChevronDown, ChevronRight, Plus,
} from 'lucide-react';
import { fmtDate, fmtMoney } from '../utils/format';
import { STATUS_COLORS, TYPE_TITLES } from '../utils/entities';
import type { Entity } from '../api/types';

// ---- Types ----
interface Advance { amount: string; date: string; description?: string }
interface AdvResult { idx: number; amount: string; paid: boolean }
interface Payment { id: number; payment_date: string; amount: string; payment_number?: string; purpose?: string }
interface EquipmentItem { id: number; equipment_id?: number; equipment_name?: string; name?: string; inv_number?: string; equipment_category?: string; category?: string }
interface HistoryItem { id: number; name: string; type_name: string; properties?: Record<string, unknown> }
type DetailEntity = Entity & { relations?: DetailRel[]; children?: HistoryItem[]; fields?: unknown[] };
interface DetailRel { id: number; from_entity_id: number; to_entity_id: number; relation_type: string; from_name?: string; to_name?: string; to_type_name?: string; from_type_name?: string }

export function EntityDetailPage() {
  const { type = 'contract', id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const entityId = id ? parseInt(id) : null;
  const isContract = type === 'contract' || type === 'supplement';

  // For contracts: use contract-card API (full data)
  const { data: cardData, isLoading: cardLoading } = useContractCard(isContract ? entityId : null);
  // For non-contracts: use entity API
  const { data: entityData, isLoading: entityLoading } = useEntity(!isContract ? entityId : null) as { data: DetailEntity | undefined; isLoading: boolean };

  const isLoading = isContract ? cardLoading : entityLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Загрузка..." />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    );
  }

  if (isContract && cardData) {
    return <ContractDetailView data={cardData} type={type} navigate={navigate} entityId={entityId!} />;
  }

  if (!isContract && entityData && type === 'equipment') {
    return <EquipmentDetailView entity={entityData} navigate={navigate} />;
  }

  if (!isContract && entityData) {
    return <GenericDetailView entity={entityData} type={type} navigate={navigate} />;
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Не найдено" />
      <div className="flex items-center justify-center flex-1 text-[var(--text-secondary)]">Сущность не найдена</div>
    </div>
  );
}

// ============================================================
// CONTRACT DETAIL VIEW (uses /api/reports/contract-card/:id)
// ============================================================
function ContractDetailView({ data, type, navigate, entityId }: {
  data: Record<string, unknown>; type: string; navigate: (p: string) => void; entityId: number;
}) {
  const d = data;
  const str = (k: string) => (d[k] as string) || '';
  const num = (k: string) => parseFloat((d[k] as string) || '0') || 0;
  const arr = (k: string) => (Array.isArray(d[k]) ? d[k] : []) as Record<string, unknown>[];
  const advances = arr('advances') as unknown as Advance[];
  const payments = arr('payments') as unknown as Payment[];
  const equipmentList = arr('equipment_list') as unknown as EquipmentItem[];
  const history = arr('history') as unknown as (HistoryItem & { is_contract?: boolean })[];
  const children = (d as Record<string, unknown>)['children'] as HistoryItem[] | undefined;
  // In history: is_contract=true is the main contract, rest are supplements
  const supplements = history.filter((h) => !h.is_contract);
  const acts = (children || []).filter((c) => c.type_name === 'act');
  const direction = str('direction');
  const docStatus = str('doc_status');
  const statusColors = STATUS_COLORS[docStatus];

  // Subject items (linked rooms, buildings, land_plots)
  const subjectRooms = arr('subject_rooms');
  const subjectBuildings = arr('subject_buildings');
  const subjectLandPlots = arr('subject_land_plots');

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={TYPE_TITLES[type] || 'Договор'}
        actions={
          <button onClick={() => navigate(`/entities/${type}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition">
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto px-6 py-5 space-y-4">

          {/* ── Header ── */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-6">
            <h1 className="text-xl font-semibold mb-2">
              {str('contractor_name')}, №{str('number')}, {fmtDate(str('date'))}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[var(--text-secondary)]">{str('contract_type')}</span>
              {direction === 'income' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">Доход</span>
              )}
              {direction === 'expense' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">Расход</span>
              )}
              {d.is_vgo && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">ВГО</span>
              )}
              {docStatus && statusColors && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: statusColors.bg, color: statusColors.text }}>
                  {docStatus}
                </span>
              )}
            </div>
          </div>

          {/* ── Main info ── */}
          <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
            <InfoRow label={str('our_role_label') || 'Наше юр. лицо'} value={str('our_legal_entity')} bold />
            <InfoRow label={str('contractor_role_label') || 'Контрагент'} value={str('contractor_name')} bold />
            {str('subtenant_name') && <InfoRow label="Субарендатор" value={str('subtenant_name')} bold />}
            {str('subject') && <InfoRow label="Предмет" value={str('subject')} />}
            {str('building') && <InfoRow label="Корпус" value={str('building')} />}

            {/* Subject objects (linked) */}
            {subjectBuildings.length > 0 && (
              <InfoRow label="Корпуса" value={subjectBuildings.map((b) => b.name as string).join(', ')} />
            )}
            {subjectRooms.length > 0 && (
              <InfoRow label="Помещения" value={subjectRooms.map((r) => r.name as string).join(', ')} />
            )}
            {subjectLandPlots.length > 0 && (
              <InfoRow label="Земельные участки" value={subjectLandPlots.map((l) => l.name as string).join(', ')} />
            )}

            {str('tenant') && <InfoRow label="Арендатор" value={str('tenant')} />}
            {str('completion_deadline') && <InfoRow label="Срок выполнения" value={str('completion_deadline')} />}
            {str('contract_end_date') && <InfoRow label="Срок действия до" value={fmtDate(str('contract_end_date'))} />}
            {!str('contract_end_date') && str('duration_text') && <InfoRow label="Срок действия" value={str('duration_text')} />}
            {str('vat_rate') && <InfoRow label="НДС" value={str('vat_rate') === 'exempt' ? 'не облагается' : str('vat_rate') + '%'} />}

            {/* Advances */}
            {advances.length > 0 && (
              <AdvancesSection advances={advances} entityId={entityId} />
            )}
          </div>

          {/* ── Rent conditions (for rental contracts) ── */}
          <RentSection data={d} />

          {/* ── Amount ── */}
          {num('contract_amount') > 0 && (
            <div className="bg-[var(--primary)] text-white rounded-xl px-6 py-4 text-center">
              <span className="text-lg font-semibold">
                Сумма договора: {fmtMoney(num('contract_amount'))} ₽
              </span>
            </div>
          )}
          {num('total_monthly') > 0 && !num('contract_amount') && (
            <div className="bg-[var(--primary)] text-white rounded-xl px-6 py-4 text-center">
              <span className="text-lg font-semibold">
                Ежемесячный платёж: {fmtMoney(num('total_monthly'))} руб.
              </span>
              {str('power_allocation_kw') && str('power_allocation_kw') !== '0' && (
                <div className="mt-1 text-sm text-white/80">
                  ⚡ Эл. мощность: {str('power_allocation_kw')} кВт
                </div>
              )}
            </div>
          )}

          {/* ── Acts ── */}
          {acts.length > 0 && (
            <CollapsibleSection title="Акты выполненных работ" icon={<FileCheck className="w-4 h-4" />} count={acts.length} defaultOpen>
              {acts.map((act) => (
                <button key={act.id} onClick={() => navigate(`/entities/act/${act.id}`)}
                  className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm">
                  {act.name}
                </button>
              ))}
            </CollapsibleSection>
          )}

          {/* ── Supplements (history) ── */}
          {supplements.length > 0 && (
            <CollapsibleSection title={`История ДС · ${supplements.length} ДС`} icon={<Paperclip className="w-4 h-4" />} count={supplements.length} defaultOpen>
              {supplements.map((s) => (
                <button key={s.id} onClick={() => navigate(`/entities/supplement/${s.id}`)}
                  className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm flex justify-between items-center">
                  <span>{s.name}</span>
                  {(s as Record<string, unknown>).changes && (
                    <span className="text-xs text-[var(--text-secondary)] ml-2 truncate max-w-[300px]">
                      {String((s as Record<string, unknown>).changes)}
                    </span>
                  )}
                </button>
              ))}
            </CollapsibleSection>
          )}

          {/* ── Equipment ── */}
          {equipmentList.length > 0 && (
            <CollapsibleSection title="Оборудование" icon={<Settings className="w-4 h-4" />} count={equipmentList.length}>
              {equipmentList.map((eq) => (
                <button key={eq.id} onClick={() => navigate(`/entities/equipment/${eq.equipment_id || eq.id}`)}
                  className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm flex justify-between">
                  <span>{eq.equipment_name || eq.name}</span>
                  {eq.inv_number && <span className="text-xs text-[var(--text-secondary)]">Инв. {eq.inv_number}</span>}
                </button>
              ))}
            </CollapsibleSection>
          )}

          {/* ── Payments ── */}
          {payments.length > 0 && (
            <CollapsibleSection title="Платежи из 1С" icon={<CreditCard className="w-4 h-4" />} count={payments.length}
              rightLabel={fmtMoney(payments.reduce((s, p) => s + parseFloat(p.amount || '0'), 0)) + ' ₽'}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-5 py-2 text-left font-medium">Дата</th>
                    <th className="px-5 py-2 text-left font-medium">Номер</th>
                    <th className="px-5 py-2 text-right font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-[var(--border)]">
                      <td className="px-5 py-2.5 text-[var(--text-secondary)]">{fmtDate(p.payment_date)}</td>
                      <td className="px-5 py-2.5">{p.payment_number || '—'}</td>
                      <td className="px-5 py-2.5 text-right font-medium tabular-nums">{fmtMoney(parseFloat(p.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleSection>
          )}

          {/* ── Action buttons ── */}
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-dark)] transition">
              <Plus className="w-3.5 h-3.5" /> Доп. соглашение
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-dark)] transition">
              <Plus className="w-3.5 h-3.5" /> Акт
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ---- Rent conditions table ----
interface RentRow { room_name: string; area: number; rate: number; monthly: number; description?: string }
interface EquipmentRentItem { equipment_name: string; rent_cost: number }

function RentSection({ data }: { data: Record<string, unknown> }) {
  const rentRows = (Array.isArray(data.rent_rows) ? data.rent_rows : []) as RentRow[];
  const equipRent = (Array.isArray(data.equipment_rent_items) ? data.equipment_rent_items : []) as EquipmentRentItem[];
  const sourceName = (data.rent_source_name as string) || '';
  const totalMonthly = parseFloat(String(data.total_monthly || '0')) || 0;

  if (rentRows.length === 0 && equipRent.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-[var(--border)]">
      <div className="px-5 py-3 bg-[var(--bg)] rounded-t-xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Текущие условия
        </span>
        {sourceName && (
          <span className="text-xs text-[var(--text-secondary)] ml-2">(из {sourceName})</span>
        )}
      </div>

      {/* Rent rows table */}
      {rentRows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--primary)] text-white">
              <th className="px-5 py-2.5 text-left font-medium">Объект аренды</th>
              <th className="px-5 py-2.5 text-right font-medium">Площадь, м²</th>
              <th className="px-5 py-2.5 text-right font-medium">Ставка (руб/м²/мес)</th>
            </tr>
          </thead>
          <tbody>
            {rentRows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)]">
                <td className="px-5 py-2.5">{row.room_name || '—'}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{row.area ? fmtMoney(row.area) : '—'}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{row.rate ? fmtMoney(row.rate) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Equipment rent rows */}
      {equipRent.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--primary)] text-white">
              <th className="px-5 py-2.5 text-left font-medium">Оборудование</th>
              <th className="px-5 py-2.5 text-right font-medium">Стоимость/мес</th>
            </tr>
          </thead>
          <tbody>
            {equipRent.map((eq, i) => (
              <tr key={i} className="border-b border-[var(--border)]">
                <td className="px-5 py-2.5">{eq.equipment_name}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{fmtMoney(eq.rent_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Monthly total */}
      {totalMonthly > 0 && (
        <div className="px-5 py-3 text-right text-sm font-semibold">
          Ежемесячный платёж: {fmtMoney(totalMonthly)} руб.
        </div>
      )}
    </div>
  );
}

// ---- Info row ----
function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex px-5 py-3">
      <span className="w-[200px] text-sm text-[var(--text-secondary)] flex-shrink-0">{label}:</span>
      <span className={`text-sm flex-1 ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

// ---- Advances section with 1C check ----
function AdvancesSection({ advances, entityId }: { advances: Advance[]; entityId: number }) {
  const [result, setResult] = useState<{ advances: AdvResult[]; checkedAt: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ advances: AdvResult[]; checkedAt: string }>(`/reports/contract-card/${entityId}/advance-status`)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityId]);

  const checkedFmt = result?.checkedAt
    ? new Date(result.checkedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="px-5 py-3">
      <span className="text-sm text-[var(--text-secondary)]">Авансы:</span>
      <div className="mt-1.5 space-y-1.5">
        {advances.map((adv, idx) => {
          const status = result?.advances?.find((a) => a.idx === idx);
          return (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <span className="font-semibold tabular-nums">{fmtMoney(parseFloat(adv.amount))} ₽</span>
              {adv.date && <span className="text-[var(--text-secondary)]">до {fmtDate(adv.date)}</span>}
              {loading && <span className="text-xs text-[var(--text-secondary)] italic">проверяется...</span>}
              {!loading && status && (
                status.paid
                  ? <span className="text-green-600 text-xs font-medium">✅ оплачено</span>
                  : <span className="text-red-600 text-xs font-medium">❌ не оплачено</span>
              )}
            </div>
          );
        })}
        {checkedFmt && (
          <div className="text-xs text-[var(--text-secondary)]">по состоянию на {checkedFmt}</div>
        )}
      </div>
    </div>
  );
}

// ---- Collapsible section ----
function CollapsibleSection({ title, icon, count, rightLabel, defaultOpen, children }: {
  title: string; icon: React.ReactNode; count?: number; rightLabel?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="bg-white rounded-xl border border-[var(--border)]">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-3 bg-[var(--bg)] rounded-t-xl hover:bg-[var(--bg-hover)] transition">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        <span className="text-sm font-medium">{title}</span>
        {count != null && <span className="text-xs text-[var(--text-secondary)]">{count}</span>}
        {rightLabel && <span className="ml-auto text-sm font-semibold tabular-nums">{rightLabel}</span>}
      </button>
      {open && children}
    </div>
  );
}

// ============================================================
// GENERIC DETAIL VIEW (non-contracts)
// ============================================================
// ── Equipment contract groups ──
const EQ_CONTRACT_GROUPS: Record<string, { label: string; types: string[]; icon: string }> = {
  supplier:    { label: 'Поставщик',                types: ['Купли-продажи'],                                          icon: 'truck' },
  tenant:      { label: 'Передано арендатору',       types: ['Аренды', 'Субаренды', 'Аренда оборудования'],              icon: 'key' },
  maintenance: { label: 'Обслуживающая организация', types: ['ТО и ППР', 'Обслуживания', 'Услуг', 'Электроснабжения'],  icon: 'wrench' },
  contractor:  { label: 'Подрядчик',                 types: ['Подряда', 'Работы/Подряда'],                               icon: 'hard-hat' },
};

const EQ_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  'В работе':         { color: '#22c55e', bg: 'rgba(34,197,94,.1)' },
  'На ремонте':       { color: '#eab308', bg: 'rgba(234,179,8,.1)' },
  'Законсервировано': { color: '#9ca3af', bg: '#f3f4f6' },
  'Списано':          { color: '#ef4444', bg: 'rgba(239,68,68,.08)' },
  'Аварийное':        { color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
};

interface EqContract {
  contract_id: number; contract_name: string; contract_parent_id?: number;
  contract_type: string; contract_date?: string; doc_status?: string;
  rent_cost?: number; contractor_name?: string; contractor_id?: number;
  our_entity_name?: string; parent_contract_name?: string;
}

function EquipmentDetailView({ entity, navigate }: { entity: DetailEntity; navigate: (p: string) => void }) {
  const props = entity.properties || {};
  const rels = entity.relations || [];
  const { data: workHistory = [] } = useWorkHistory(entity.id);
  const eqContracts = ((entity as Record<string, unknown>).equipment_contracts || []) as EqContract[];

  const status = (props.status as string) || '';
  const category = (props.equipment_category as string) || '';
  const kind = (props.equipment_kind as string) || '';
  const inv = (props.inv_number as string) || '';
  const serial = (props.serial_number as string) || '';
  const year = (props.year as string) || '';
  const mfr = (props.manufacturer as string) || '';
  const price = props.purchase_price != null ? Number(props.purchase_price) : null;
  const note = (props.note as string) || '';
  const balOwner = (props.balance_owner_name as string) || '';
  const st = EQ_STATUS_STYLE[status] || { color: '#9ca3af', bg: '#f3f4f6' };

  // Components (part_of this equipment)
  const components = rels.filter((r) => r.relation_type === 'part_of' && r.to_entity_id === entity.id);
  // Acts (subject_of → act)
  // Located in
  const locatedIn = rels.filter((r) => r.relation_type === 'located_in' && r.from_entity_id === entity.id);

  // Group contracts by role, deduplicate by root contract
  const contractsByGroup: Record<string, EqContract[]> = {};
  eqContracts.forEach((c) => {
    let groupKey = 'other';
    for (const [key, cfg] of Object.entries(EQ_CONTRACT_GROUPS)) {
      if (cfg.types.includes(c.contract_type)) { groupKey = key; break; }
    }
    (contractsByGroup[groupKey] ||= []).push(c);
  });
  // Deduplicate: keep latest per root contract + contractor
  for (const gk of Object.keys(contractsByGroup)) {
    const byRoot: Record<string, EqContract> = {};
    contractsByGroup[gk].forEach((c) => {
      const rootKey = `${c.contract_parent_id || c.contract_id}_${c.contractor_name || ''}`;
      if (!byRoot[rootKey] || (c.contract_date || '') > (byRoot[rootKey].contract_date || '')) {
        byRoot[rootKey] = c;
      }
    });
    contractsByGroup[gk] = Object.values(byRoot);
  }

  const groupOrder = ['supplier', 'tenant', 'maintenance', 'contractor', 'other'];

  // Info rows
  const infoRows: [string, string | React.ReactNode][] = [];
  if (inv) infoRows.push(['Инв. номер', inv]);
  if (serial) infoRows.push(['Серийный номер', serial]);
  if (year) infoRows.push(['Год выпуска', year]);
  if (mfr) infoRows.push(['Производитель', mfr]);
  if (price != null && !isNaN(price)) infoRows.push(['Стоимость', fmtMoney(price) + ' ₽']);
  if (balOwner) infoRows.push(['Балансодержатель', balOwner]);
  if ((entity as Record<string, unknown>).parent_name) {
    infoRows.push(['Расположение', String((entity as Record<string, unknown>).parent_name)]);
  }
  const partOfRel = rels.find((r) => r.relation_type === 'part_of' && r.from_entity_id === entity.id);
  if (partOfRel) {
    infoRows.push(['Входит в состав',
      <button key="partof" onClick={() => navigate(`/entities/equipment/${partOfRel.to_entity_id}`)}
        className="text-[var(--primary)] hover:underline">{partOfRel.to_name || `#${partOfRel.to_entity_id}`}</button>
    ]);
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Оборудование"
        actions={
          <button onClick={() => navigate('/entities/equipment')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition">
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto px-6 py-5 space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-6">
            <h1 className="text-xl font-bold mb-2 leading-tight">{entity.name}</h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              {status && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                  style={{ backgroundColor: st.bg, color: st.color }}>
                  <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ backgroundColor: st.color }} />
                  {status}
                </span>
              )}
              {category && (
                <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {category}
                </span>
              )}
              {kind && kind !== category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  {kind}
                </span>
              )}
            </div>
          </div>

          {/* Info grid */}
          {infoRows.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {infoRows.map(([label, value], i) => (
                <div key={i} className="flex px-5 py-3">
                  <span className="w-[140px] text-xs text-[var(--text-muted)] flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm font-medium flex-1">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Contract-based sections */}
          {groupOrder.map((groupKey) => {
            const items = contractsByGroup[groupKey];
            if (!items?.length) return null;
            const cfg = EQ_CONTRACT_GROUPS[groupKey] || { label: 'Прочие договоры', icon: 'file-text' };
            return (
              <div key={groupKey} className="bg-white rounded-xl border border-[var(--border)]">
                <div className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] rounded-t-xl">
                  <Settings className="w-3.5 h-3.5" />
                  {cfg.label}
                </div>
                {items.map((c, i) => (
                  <div key={i} className="px-5 py-3 border-b last:border-b-0 border-[var(--border)]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{c.contractor_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        {c.contract_type}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)] flex items-center gap-1 flex-wrap">
                      {c.parent_contract_name && (
                        <button onClick={() => navigate(`/entities/contract/${c.contract_parent_id}`)}
                          className="text-[var(--primary)] hover:underline">{c.parent_contract_name}</button>
                      )}
                      {c.parent_contract_name && c.contract_name && <span>→</span>}
                      <button onClick={() => navigate(`/entities/${c.contract_parent_id ? 'supplement' : 'contract'}/${c.contract_id}`)}
                        className="text-[var(--primary)] hover:underline font-medium">{c.contract_name}</button>
                      {c.contract_date && <span>{fmtDate(c.contract_date)}</span>}
                      {c.doc_status && (
                        <span className={`font-medium ${c.doc_status === 'Подписан' ? 'text-green-600' : 'text-[var(--text-secondary)]'}`}>
                          {c.doc_status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Located in */}
          {locatedIn.length > 0 && (
            <CollapsibleSection title="Расположение" icon={null} count={locatedIn.length} defaultOpen>
              {locatedIn.map((r) => (
                <button key={r.id} onClick={() => navigate(`/entities/_/${r.to_entity_id}`)}
                  className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm">
                  {r.to_name || `#${r.to_entity_id}`}
                </button>
              ))}
            </CollapsibleSection>
          )}

          {/* Components */}
          {components.length > 0 && (
            <CollapsibleSection title="Компоненты" icon={<Settings className="w-4 h-4" />} count={components.length} defaultOpen>
              {components.map((r) => (
                <button key={r.id} onClick={() => navigate(`/entities/equipment/${r.from_entity_id}`)}
                  className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
                  {r.from_name || `#${r.from_entity_id}`}
                </button>
              ))}
            </CollapsibleSection>
          )}

          {/* Work history (from API) */}
          {workHistory.length > 0 && (
            <CollapsibleSection title="История работ" icon={<FileCheck className="w-4 h-4" />} count={workHistory.length} defaultOpen>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-[var(--border)] text-[var(--text-secondary)] bg-[var(--bg-secondary)]">
                      <th className="px-4 py-2 text-left font-medium">Дата</th>
                      <th className="px-4 py-2 text-left font-medium">Акт</th>
                      <th className="px-4 py-2 text-left font-medium">Описание работ</th>
                      <th className="px-4 py-2 text-right font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workHistory.map((wh) => (
                      <tr key={wh.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(wh.act_date)}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => navigate(`/entities/act/${wh.id}`)}
                            className="text-[var(--primary)] hover:underline text-left">
                            {wh.name}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[400px]">
                          {wh.item_broken && <span className="inline-block text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded mr-1">Неисправность</span>}
                          <span className="text-[var(--text-secondary)] whitespace-pre-wrap text-xs leading-relaxed">{wh.item_description}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-medium">
                          {parseFloat(wh.item_amount || '0') > 0 ? fmtMoney(parseFloat(wh.item_amount!)) + ' ₽' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Note */}
          {note && (
            <div className="bg-[var(--bg-secondary)] rounded-xl border-l-[3px] border-[var(--border)] px-5 py-3">
              <div className="text-[11px] text-[var(--text-muted)] font-semibold mb-1 uppercase">Примечание</div>
              <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GenericDetailView({ entity, type, navigate }: { entity: DetailEntity; type: string; navigate: (p: string) => void }) {
  const props = entity.properties || {};
  const relations = entity.relations || [];
  const children = entity.children || [];
  const status = (props.doc_status as string) || (props.status as string) || '';
  const statusColors = STATUS_COLORS[status];

  const fields: { label: string; value: string; bold?: boolean }[] = [];
  const add = (label: string, value: unknown, bold?: boolean) => {
    if (value != null && value !== '' && value !== 'null') fields.push({ label, value: String(value), bold });
  };

  add('Название', entity.name, true);
  add('Статус', status);
  // Company fields
  add('ИНН', props.inn);
  add('КПП', props.kpp);
  add('Контактное лицо', props.contact_person);
  add('Телефон', props.phone);
  add('Email', props.email);
  // Building fields
  add('Сокращение', props.short_name);
  add('Площадь', props.area);
  add('Этаж', props.floor);
  // Equipment fields
  add('Категория', props.equipment_category);
  add('Вид', props.equipment_kind);
  add('Инв. номер', props.inv_number);
  add('Серийный номер', props.serial_number);
  add('Год', props.year);
  add('Производитель', props.manufacturer);
  // Generic
  add('Примечание', props.note);

  // Relation groups
  const relGroups: Record<string, DetailRel[]> = {};
  relations.forEach((r) => { (relGroups[r.relation_type] ||= []).push(r); });
  const relLabels: Record<string, string> = {
    our_entity: 'Наше юрлицо', contractor: 'Контрагент', supplement_to: 'ДС к договору',
    located_in: 'Расположение', on_balance: 'На балансе', party_to: 'Сторона',
    subject_of: 'Предмет', part_of: 'Часть',
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title={TYPE_TITLES[type] || 'Сущность'}
        actions={
          <button onClick={() => navigate(`/entities/${type}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition">
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto px-6 py-5 space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-6">
            <h1 className="text-xl font-semibold mb-1">{entity.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">{entity.type_name_ru}</span>
              {status && statusColors && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: statusColors.bg, color: statusColors.text }}>{status}</span>
              )}
            </div>
          </div>

          {/* Fields */}
          {fields.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {fields.map((f, i) => (
                <div key={i} className="flex px-5 py-3">
                  <span className="w-[200px] text-sm text-[var(--text-secondary)] flex-shrink-0">{f.label}</span>
                  <span className={`text-sm flex-1 ${f.bold ? 'font-semibold' : ''}`}>{f.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Relations */}
          {Object.keys(relGroups).length > 0 && (
            <div className="space-y-3">
              {Object.entries(relGroups).map(([relType, rels]) => (
                <CollapsibleSection key={relType} title={relLabels[relType] || relType} icon={null} count={rels.length} defaultOpen>
                  {rels.map((r) => {
                    const isFrom = r.from_entity_id === entity.id;
                    const linkedId = isFrom ? r.to_entity_id : r.from_entity_id;
                    const linkedName = isFrom ? r.to_name : r.from_name;
                    return (
                      <button key={r.id} onClick={() => navigate(`/entities/_/${linkedId}`)}
                        className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm">
                        {linkedName || `#${linkedId}`}
                      </button>
                    );
                  })}
                </CollapsibleSection>
              ))}
            </div>
          )}

          {/* Children */}
          {children.length > 0 && (
            <CollapsibleSection title="Дочерние элементы" icon={null} count={children.length} defaultOpen>
              {children.map((c) => (
                <button key={c.id} onClick={() => navigate(`/entities/${c.type_name}/${c.id}`)}
                  className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm">
                  {c.name}
                </button>
              ))}
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
