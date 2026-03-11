import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Entity, EntityType, Relation, FieldDefinition } from './types';

// ---- Entity Types ----
export function useEntityTypes() {
  return useQuery({
    queryKey: ['entity-types'],
    queryFn: () => apiGet<EntityType[]>('/entity-types'),
    staleTime: 5 * 60_000,
  });
}

// ---- Entities list ----
interface UseEntitiesOpts {
  type?: string;
  search?: string;
  enabled?: boolean;
}

export function useEntities({ type, search, enabled = true }: UseEntitiesOpts = {}) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (search) params.set('search', search);
  params.set('limit', '2000');
  const qs = params.toString();

  return useQuery({
    queryKey: ['entities', type, search],
    queryFn: () => apiGet<Entity[]>(`/entities${qs ? '?' + qs : ''}`),
    enabled,
  });
}

// ---- Single entity ----
// ---- Contract type fields (per contract_type dynamic fields config) ----
export interface ContractTypeField {
  name: string;
  name_ru: string;
  field_type: string;
  options?: string[];
  _group?: string;
  _readonly?: boolean;
}
export function useContractTypeFields() {
  return useQuery({
    queryKey: ['contract-type-fields'],
    queryFn: () => apiGet<Record<string, ContractTypeField[]>>('/contract-type-fields'),
    staleTime: 10 * 60_000,
  });
}

// ---- System lookups (field options by name) ----
export function useLookup(fieldName: string) {
  return useQuery({
    queryKey: ['lookup', fieldName],
    queryFn: () => apiGet<string[]>(`/entity-types/lookups/${fieldName}`),
    staleTime: 10 * 60_000,
  });
}

export function useEntity(id: number | null) {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiGet<Entity>(`/entities/${id}`),
    enabled: !!id,
  });
}

// ---- Relations ----
export function useRelations(entityId: number | null) {
  return useQuery({
    queryKey: ['relations', entityId],
    queryFn: () => apiGet<Relation[]>(`/relations?entity_id=${entityId}`),
    enabled: !!entityId,
  });
}

// ---- Contract line items ----
export function useContractLineItems(entityId: number | null) {
  return useQuery({
    queryKey: ['contract-line-items', entityId],
    queryFn: () => apiGet<unknown[]>(`/entities/${entityId}/work-history`),
    enabled: !!entityId,
  });
}

// ---- Work history (for equipment) ----
export function useWorkHistory(entityId: number | null) {
  return useQuery({
    queryKey: ['work-history', entityId],
    queryFn: () => apiGet<WorkHistoryItem[]>(`/entities/${entityId}/work-history`),
    enabled: !!entityId,
  });
}

export interface WorkHistoryItem {
  id: number; name: string; act_date?: string; act_number?: string;
  doc_status?: string; contract_id?: number; contract_name?: string;
  item_description?: string; item_amount?: string; item_broken?: boolean;
}

// ---- Payments (1C) ----
export function usePayments(entityId: number | null) {
  return useQuery({
    queryKey: ['payments', entityId],
    queryFn: () => apiGet<unknown>(`/entities/${entityId}/payments`),
    enabled: !!entityId,
    retry: false,
  });
}

// ---- Contract Card (full report) ----
export function useContractCard(entityId: number | null) {
  return useQuery({
    queryKey: ['contract-card', entityId],
    queryFn: () => apiGet<Record<string, unknown>>(`/reports/contract-card/${entityId}`),
    enabled: !!entityId,
  });
}

// ---- Advance status ----
export function useAdvanceStatus(entityId: number | null, hasAdvances: boolean) {
  return useQuery({
    queryKey: ['advance-status', entityId],
    queryFn: () => apiGet<Record<string, unknown>>(`/reports/contract-card/${entityId}/advance-status`),
    enabled: !!entityId && hasAdvances,
    retry: false,
  });
}

// ---- Field definitions for entity type ----
export function useFieldDefinitions(entityTypeId: number | null) {
  return useQuery({
    queryKey: ['field-definitions', entityTypeId],
    queryFn: () => apiGet<FieldDefinition[]>(`/entity-types/${entityTypeId}/fields`),
    enabled: !!entityTypeId,
    staleTime: 5 * 60_000,
  });
}

// ---- Mutations ----
export function useCreateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entity_type_id: number; name: string; properties: Record<string, unknown>; parent_id?: number | null }) =>
      apiPost<Entity>('/entities', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entities'] }); },
  });
}

export function useUpdateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; properties?: Record<string, unknown>; parent_id?: number | null }) =>
      apiPut<Entity>(`/entities/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['entities'] });
      qc.invalidateQueries({ queryKey: ['entity', vars.id] });
      qc.invalidateQueries({ queryKey: ['contract-card', vars.id] });
    },
  });
}

export function useDeleteEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/entities/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entities'] }); },
  });
}

export function useCreateRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { from_entity_id: number; to_entity_id: number; relation_type: string; properties?: Record<string, unknown> }) =>
      apiPost<Relation>('/relations', data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['relations', vars.from_entity_id] });
      qc.invalidateQueries({ queryKey: ['relations', vars.to_entity_id] });
    },
  });
}

export function useDeleteRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/relations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['relations'] }); },
  });
}

// ---- Stats (Dashboard) ----
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => apiGet<{ types: Array<{ name: string; name_ru: string; icon: string; color: string; count: number }>; totalRelations: number }>('/stats'),
    staleTime: 60_000,
  });
}

// ---- Finance ----
export function useFinanceSummary(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return useQuery({
    queryKey: ['finance-summary', from, to],
    queryFn: () => apiGet<Record<string, unknown>>(`/finance/summary${qs ? '?' + qs : ''}`),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useFinanceOverdue(org?: string) {
  const qs = org ? `?org=${org}` : '';
  return useQuery({
    queryKey: ['finance-overdue', org],
    queryFn: () => apiGet<Record<string, unknown>>(`/finance/overdue${qs}`),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useFinanceExpenses() {
  return useQuery({
    queryKey: ['finance-expenses'],
    queryFn: () => apiGet<Record<string, unknown>>('/finance/expenses'),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useFinanceBudget(cfo?: string, type?: string) {
  const params = new URLSearchParams();
  if (cfo) params.set('cfo', cfo);
  if (type) params.set('type', type);
  return useQuery({
    queryKey: ['finance-budget', cfo, type],
    queryFn: () => apiGet<Record<string, unknown>>(`/finance/budget?${params}`),
    enabled: !!cfo,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// ---- Reports ----
export function useRentAnalysis() {
  return useQuery({
    queryKey: ['rent-analysis'],
    queryFn: () => apiGet<Array<Record<string, unknown>>>('/reports/rent-analysis'),
    staleTime: 60_000,
  });
}

export function useAreaStats() {
  return useQuery({
    queryKey: ['area-stats'],
    queryFn: () => apiGet<Record<string, unknown>>('/reports/area-stats'),
    staleTime: 60_000,
  });
}
