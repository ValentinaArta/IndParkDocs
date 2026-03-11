import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import {
  useEntity, useEntityTypes, useFieldDefinitions,
  useCreateEntity, useUpdateEntity, useDeleteEntity,
} from '../api/hooks';
import { FieldInput } from '../components/form/FieldInput';
import { EntitySearch } from '../components/form/EntitySearch';
import { ContractFieldsLayout } from '../components/form/ContractFieldsLayout';
import { TYPE_TITLES } from '../utils/entities';
// FieldDefinition type used by ContractFieldsLayout (now in separate file)

export function EntityFormPage() {
  const { type, id } = useParams<{ type: string; id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const entityId = id ? parseInt(id) : null;

  // Parent from query string (for supplements, acts)
  const parentIdParam = searchParams.get('parent_id');
  const parentNameParam = searchParams.get('parent_name');

  const { data: entityTypes = [] } = useEntityTypes();
  const entityType = entityTypes.find((t) => t.name === type);
  const entityTypeId = entityType?.id ?? null;

  const { data: existingEntity, isLoading: loadingEntity } = useEntity(isEdit ? entityId : null);
  const { data: parentData } = useEntity(!isEdit && parentIdParam ? parseInt(parentIdParam) : null);
  const { data: fields = [], isLoading: loadingFields } = useFieldDefinitions(entityTypeId);

  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();
  const deleteMutation = useDeleteEntity();

  const [name, setName] = useState('');
  const [properties, setProperties] = useState<Record<string, unknown>>({});
  const [parentEntity, setParentEntity] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Init from existing entity (edit mode)
  useEffect(() => {
    if (isEdit && existingEntity) {
      setName(existingEntity.name);
      setProperties(existingEntity.properties || {});
      if (existingEntity.parent_id && existingEntity.parent_name) {
        setParentEntity({ id: existingEntity.parent_id, name: existingEntity.parent_name });
      }
    }
  }, [isEdit, existingEntity]);

  // Init parent from query params (create mode)
  useEffect(() => {
    if (!isEdit && parentIdParam) {
      setParentEntity({ id: parseInt(parentIdParam), name: parentNameParam || `#${parentIdParam}` });
    }
  }, [isEdit, parentIdParam, parentNameParam]);

  // Inherit party fields from parent contract when creating supplement
  useEffect(() => {
    if (!isEdit && type === 'supplement' && parentData?.properties) {
      const pp = parentData.properties as Record<string, unknown>;
      const inherited: Record<string, unknown> = {};
      const partyFields = [
        'our_role_label', 'our_legal_entity', 'contractor_role_label',
        'contractor_name', 'subtenant_name', 'contract_type', 'vat_rate',
      ];
      for (const key of partyFields) {
        if (pp[key] && !properties[key]) inherited[key] = pp[key];
      }
      if (Object.keys(inherited).length > 0) {
        setProperties(prev => ({ ...inherited, ...prev }));
      }
    }
  }, [!isEdit, type, parentData]);

  // Auto-generate name for supplements and contracts
  useEffect(() => {
    if (type === 'supplement') {
      const num = (properties.number as string) || '';
      const contractor = (properties.contractor_name as string) || '';
      if (num || contractor) {
        const parts = ['ДС'];
        if (num) parts[0] = `ДС №${num}`;
        if (contractor) parts.push(`— ${contractor}`);
        setName(parts.join(' '));
      }
    }
  }, [type, properties.number, properties.contractor_name]);

  // Determine if this type needs a parent selector
  const needsParent = useMemo(() => {
    return ['supplement', 'act', 'room'].includes(type || '');
  }, [type]);

  const parentType = useMemo(() => {
    if (type === 'supplement' || type === 'act') return 'contract';
    if (type === 'room') return 'building';
    return undefined;
  }, [type]);

  function handleFieldChange(fieldName: string, value: unknown) {
    setProperties((prev) => ({ ...prev, [fieldName]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Введите название'); return; }
    if (!entityTypeId) { setError('Тип сущности не определён'); return; }

    try {
      if (isEdit && entityId) {
        const result = await updateMutation.mutateAsync({
          id: entityId,
          name: name.trim(),
          properties,
          parent_id: parentEntity?.id ?? null,
        });
        navigate(`/entities/${type}/${result.id}`);
      } else {
        const result = await createMutation.mutateAsync({
          entity_type_id: entityTypeId,
          name: name.trim(),
          properties,
          parent_id: parentEntity?.id ?? null,
        });
        navigate(`/entities/${type}/${result.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(msg);
    }
  }

  async function handleDelete() {
    if (!entityId) return;
    try {
      await deleteMutation.mutateAsync(entityId);
      navigate(`/entities/${type}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка удаления';
      setError(msg);
    }
  }

  const title = isEdit
    ? `Редактирование: ${existingEntity?.name || '...'}`
    : `Новый: ${TYPE_TITLES[type || ''] || entityType?.name_ru || type}`;

  const loading = loadingFields || (isEdit && loadingEntity);
  const saving = createMutation.isPending || updateMutation.isPending;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name — hidden for supplements (auto-generated) */}
        {type !== 'supplement' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              placeholder="Введите название"
              autoFocus
            />
          </div>
        )}

        {/* Parent entity — hidden for supplements (inherited from context) */}
        {needsParent && type !== 'supplement' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'room' ? 'Корпус' : 'Договор-основание'}
            </label>
            <EntitySearch
              value={parentEntity}
              onChange={setParentEntity}
              entityType={parentType}
              placeholder={type === 'room' ? 'Выберите корпус...' : 'Выберите договор...'}
            />
          </div>
        )}

        {/* Dynamic fields — contract/supplement get grouped layout */}
        {(type === 'contract' || type === 'supplement') ? (
          <ContractFieldsLayout fields={fields} properties={properties} onChange={handleFieldChange} isEdit={isEdit} isSupp={type === 'supplement'} />
        ) : (
          fields.map((f) => (
            <FieldInput
              key={f.id}
              field={f}
              value={properties[f.name]}
              onChange={handleFieldChange}
            />
          ))
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEdit ? 'Сохранить' : 'Создать'}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            Отмена
          </button>

          {isEdit && (
            <div className="ml-auto">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Удалить?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    Да
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Нет
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

