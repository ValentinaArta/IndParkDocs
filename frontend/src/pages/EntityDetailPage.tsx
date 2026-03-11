import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { useEntity } from '../api/hooks';
import { apiGet } from '../api/client';
import {
  ArrowLeft, Loader2, FileText, Paperclip, FileCheck,
  CreditCard, Settings, Building2, MapPin, ChevronDown, ChevronRight,
} from 'lucide-react';
import { fmtDate, fmtMoney, fmtNum } from '../utils/format';
import { STATUS_COLORS, TYPE_TITLES } from '../utils/entities';
import type { Entity } from '../api/types';

interface DetailRelation {
  id: number;
  from_entity_id: number;
  to_entity_id: number;
  relation_type: string;
  from_name?: string;
  to_name?: string;
}

interface DetailChild {
  id: number;
  name: string;
  type_name: string;
  type_name_ru: string;
  properties: Record<string, unknown>;
}

interface Payment {
  id: number;
  payment_date: string;
  amount: string;
  payment_number?: string;
  purpose?: string;
}

interface EquipmentItem {
  id: number;
  equipment_id: number;
  equipment_name: string;
  inv_number?: string;
  equipment_category?: string;
  rent_cost?: number;
}

interface FieldDef {
  field_name: string;
  label: string;
  field_type: string;
  options?: string[];
}

type DetailEntity = Entity & {
  relations?: DetailRelation[];
  children?: DetailChild[];
  fields?: FieldDef[];
};

type TabKey = 'info' | 'relations' | 'supplements' | 'payments' | 'equipment';

export function EntityDetailPage() {
  const { type = 'contract', id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const entityId = id ? parseInt(id) : null;
  const { data: entity, isLoading } = useEntity(entityId) as { data: DetailEntity | undefined; isLoading: boolean };
  const [activeTab, setActiveTab] = useState<TabKey>('info');

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

  if (!entity) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Не найдено" />
        <div className="flex items-center justify-center flex-1 text-[var(--text-secondary)]">
          Сущность не найдена
        </div>
      </div>
    );
  }

  const props = entity.properties || {};
  const relations = entity.relations || [];
  const children = entity.children || [];
  const payments: Payment[] = (props.payments as Payment[]) || [];
  const equipmentList: EquipmentItem[] = (props.equipment_list as EquipmentItem[]) || [];
  const supplements = children.filter((c) => c.type_name === 'supplement');
  const acts = children.filter((c) => c.type_name === 'act');
  const status = (props.doc_status as string) || (props.status as string) || '';
  const statusColors = STATUS_COLORS[status];

  // Build tabs
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'info', label: 'Информация' },
  ];
  if (relations.length > 0) tabs.push({ key: 'relations', label: 'Связи', count: relations.length });
  if (supplements.length > 0 || acts.length > 0) {
    tabs.push({ key: 'supplements', label: 'ДС и акты', count: supplements.length + acts.length });
  }
  if (payments.length > 0) tabs.push({ key: 'payments', label: 'Платежи', count: payments.length });
  if (equipmentList.length > 0) tabs.push({ key: 'equipment', label: 'Оборудование', count: equipmentList.length });

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={TYPE_TITLES[type] || 'Сущность'}
        actions={
          <button
            onClick={() => navigate(`/entities/${type}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto px-6 py-5">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-6 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-semibold mb-2">{entity.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  {entity.effective_contractor_name && (
                    <span>{entity.effective_contractor_name}</span>
                  )}
                  {entity.effective_contract_type && (
                    <span className="px-2 py-0.5 bg-[var(--bg)] rounded-full text-xs">
                      {entity.effective_contract_type}
                    </span>
                  )}
                  {entity.effective_our_legal_entity && (
                    <span className="text-xs">{entity.effective_our_legal_entity}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {status && statusColors && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
                  >
                    {status}
                  </span>
                )}
                {entity.effective_amount && (
                  <span className="text-lg font-semibold tabular-nums">
                    {fmtMoney(parseFloat(entity.effective_amount))} ₽
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          {tabs.length > 1 && (
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                    ${activeTab === tab.key
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}
                  `}
                >
                  {tab.label}
                  {tab.count != null && (
                    <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          {activeTab === 'info' && <InfoTab entity={entity} />}
          {activeTab === 'relations' && <RelationsTab relations={relations} entityId={entity.id} navigate={navigate} />}
          {activeTab === 'supplements' && <ChildrenTab supplements={supplements} acts={acts} navigate={navigate} type={type} />}
          {activeTab === 'payments' && <PaymentsTab payments={payments} />}
          {activeTab === 'equipment' && <EquipmentTab items={equipmentList} navigate={navigate} />}
        </div>
      </div>
    </div>
  );
}

// ---- Advance Status Component ----
interface AdvanceStatusResult {
  advances: { idx: number; amount: string; paid: boolean; matchDoc?: string | null }[];
  checkedAt: string;
}

function AdvanceStatusRow({ entityId, paymentStatus }: { entityId: number; paymentStatus: string }) {
  const [result, setResult] = useState<AdvanceStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!paymentStatus || !paymentStatus.toLowerCase().includes('аванс')) return;
    setLoading(true);
    apiGet<AdvanceStatusResult>(`/reports/contract-card/${entityId}/advance-status`)
      .then((data) => { setResult(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [entityId, paymentStatus]);

  if (!paymentStatus) return null;

  const checkedAt = result?.checkedAt
    ? new Date(result.checkedAt).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <div className="flex px-5 py-3">
      <span className="w-[200px] text-sm text-[var(--text-secondary)] flex-shrink-0">
        Статус оплаты
      </span>
      <div className="text-sm flex-1">
        <span>{paymentStatus}</span>
        {loading && (
          <span className="ml-2 text-xs text-[var(--text-secondary)]">проверяю в 1С...</span>
        )}
        {error && (
          <span className="ml-2 text-xs text-[var(--text-secondary)]">— не удалось проверить</span>
        )}
        {result && checkedAt && (
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            по состоянию на {checkedAt}
            {result.advances?.map((adv, i) => (
              <span key={i} className={`ml-2 ${adv.paid ? 'text-green-600' : 'text-red-600'}`}>
                {adv.paid ? '✅ оплачено' : '❌ не оплачено'}
                {adv.amount && ` (${fmtMoney(parseFloat(adv.amount))} ₽)`}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Info Tab ----
function InfoTab({ entity }: { entity: DetailEntity }) {
  const props = entity.properties || {};
  const paymentStatus = (props.payment_status as string) || '';

  // Build field list from known properties
  const fields: { label: string; value: string; isPaymentStatus?: boolean }[] = [];

  const addField = (label: string, value: unknown) => {
    if (value != null && value !== '' && value !== 'null') {
      fields.push({ label, value: String(value) });
    }
  };

  addField('Номер', props.number);
  addField('Дата договора', fmtDate(props.contract_date as string));
  addField('Тип договора', entity.effective_contract_type);
  addField('Контрагент', entity.effective_contractor_name);
  addField('Наше юрлицо', entity.effective_our_legal_entity);
  addField('Наша роль', props.our_role_label);
  addField('Роль контрагента', props.contractor_role_label);
  addField('Статус', props.doc_status || props.status);
  // payment_status handled separately below
  addField('Сумма', entity.effective_amount ? fmtMoney(parseFloat(entity.effective_amount)) + ' ₽' : null);
  addField('НДС', props.vat_rate ? (props.vat_rate === 'exempt' ? 'не облагается' : props.vat_rate + '%') : null);
  addField('Дата окончания', fmtDate(props.contract_end_date as string));
  addField('Предмет', props.subject || props.service_subject);
  addField('Комментарий', props.service_comment);
  addField('ВГО', props.is_vgo === true ? 'Да' : props.is_vgo === false ? 'Нет' : null);
  addField('Помещения', entity.located_in_names);

  // Generic: building, equipment, company
  addField('Площадь', props.area);
  addField('Этаж', props.floor);
  addField('ИНН', props.inn);
  addField('КПП', props.kpp);
  addField('Категория', props.equipment_category);
  addField('Вид', props.equipment_kind);
  addField('Инв. номер', props.inv_number);
  addField('Серийный номер', props.serial_number);
  addField('Год', props.year);
  addField('Производитель', props.manufacturer);
  addField('Примечание', props.note);

  if (fields.length === 0 && !paymentStatus) {
    return (
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 text-center text-[var(--text-secondary)] text-sm">
        Нет данных
      </div>
    );
  }

  // Find where to insert payment_status (after "Статус" row)
  const statusIdx = fields.findIndex((f) => f.label === 'Статус');
  const insertIdx = statusIdx >= 0 ? statusIdx + 1 : fields.length;

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
      {fields.slice(0, insertIdx).map((f, i) => (
        <div key={i} className="flex px-5 py-3">
          <span className="w-[200px] text-sm text-[var(--text-secondary)] flex-shrink-0">{f.label}</span>
          <span className="text-sm flex-1">{f.value}</span>
        </div>
      ))}
      {paymentStatus && (
        <AdvanceStatusRow entityId={entity.id} paymentStatus={paymentStatus} />
      )}
      {fields.slice(insertIdx).map((f, i) => (
        <div key={`after-${i}`} className="flex px-5 py-3">
          <span className="w-[200px] text-sm text-[var(--text-secondary)] flex-shrink-0">{f.label}</span>
          <span className="text-sm flex-1">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Relations Tab ----
function RelationsTab({
  relations, entityId, navigate,
}: {
  relations: DetailRelation[];
  entityId: number;
  navigate: (path: string) => void;
}) {
  // Group by relation type
  const groups: Record<string, DetailRelation[]> = {};
  relations.forEach((r) => {
    const key = r.relation_type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const typeLabels: Record<string, string> = {
    our_entity: 'Наше юрлицо',
    contractor: 'Контрагент',
    supplement_to: 'ДС к договору',
    located_in: 'Расположение',
    on_balance: 'На балансе',
    party_to: 'Сторона',
    subject_of: 'Предмет',
    part_of: 'Часть',
  };

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([relType, rels]) => (
        <div key={relType} className="bg-white rounded-xl border border-[var(--border)]">
          <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)] rounded-t-xl">
            <span className="text-sm font-medium">{typeLabels[relType] || relType}</span>
            <span className="text-xs text-[var(--text-secondary)] ml-2">{rels.length}</span>
          </div>
          {rels.map((r) => {
            const isFrom = r.from_entity_id === entityId;
            const linkedId = isFrom ? r.to_entity_id : r.from_entity_id;
            const linkedName = isFrom ? r.to_name : r.from_name;
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/entities/_/${linkedId}`)}
                className="w-full text-left px-5 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors text-sm"
              >
                {linkedName || `#${linkedId}`}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---- Children (Supplements + Acts) Tab ----
function ChildrenTab({
  supplements, acts, navigate, type,
}: {
  supplements: DetailChild[];
  acts: DetailChild[];
  navigate: (path: string) => void;
  type: string;
}) {
  return (
    <div className="space-y-4">
      {supplements.length > 0 && (
        <ChildGroup
          title="Доп. соглашения"
          icon={<Paperclip className="w-4 h-4" />}
          items={supplements}
          navigate={navigate}
          linkType="supplement"
        />
      )}
      {acts.length > 0 && (
        <ChildGroup
          title="Акты"
          icon={<FileCheck className="w-4 h-4" />}
          items={acts}
          navigate={navigate}
          linkType="act"
        />
      )}
    </div>
  );
}

function ChildGroup({
  title, icon, items, navigate, linkType,
}: {
  title: string;
  icon: React.ReactNode;
  items: DetailChild[];
  navigate: (path: string) => void;
  linkType: string;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-[var(--border)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-5 py-3 bg-[var(--bg)] rounded-t-xl hover:bg-[var(--bg-hover)] transition"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-[var(--text-secondary)] ml-auto">{items.length}</span>
      </button>
      {expanded && items.map((item) => (
        <button
          key={item.id}
          onClick={() => navigate(`/entities/${linkType}/${item.id}`)}
          className="w-full text-left px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-sm"
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}

// ---- Payments Tab ----
function PaymentsTab({ payments }: { payments: Payment[] }) {
  const total = payments.reduce((s, p) => s + parseFloat(p.amount || '0'), 0);

  return (
    <div className="bg-white rounded-xl border border-[var(--border)]">
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)] rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium">Платежи из 1С</span>
        </div>
        <span className="text-sm font-semibold tabular-nums">{fmtMoney(total)} ₽</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
            <th className="px-5 py-2 text-left font-medium">Дата</th>
            <th className="px-5 py-2 text-left font-medium">Номер</th>
            <th className="px-5 py-2 text-right font-medium">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-[var(--border)] last:border-b-0">
              <td className="px-5 py-2.5 text-[var(--text-secondary)]">{fmtDate(p.payment_date)}</td>
              <td className="px-5 py-2.5">{p.payment_number || '—'}</td>
              <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                {fmtMoney(parseFloat(p.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Equipment Tab ----
function EquipmentTab({
  items, navigate,
}: {
  items: EquipmentItem[];
  navigate: (path: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)]">
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)] rounded-t-xl flex items-center gap-2">
        <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
        <span className="text-sm font-medium">Оборудование</span>
        <span className="text-xs text-[var(--text-secondary)] ml-auto">{items.length}</span>
      </div>
      {items.map((eq) => (
        <button
          key={eq.id}
          onClick={() => eq.equipment_id && navigate(`/entities/equipment/${eq.equipment_id}`)}
          className="w-full text-left px-5 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between"
        >
          <div>
            <div className="text-sm font-medium">{eq.equipment_name}</div>
            {eq.equipment_category && (
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">{eq.equipment_category}</div>
            )}
          </div>
          {eq.inv_number && (
            <span className="text-xs text-[var(--text-secondary)]">Инв. {eq.inv_number}</span>
          )}
        </button>
      ))}
    </div>
  );
}
