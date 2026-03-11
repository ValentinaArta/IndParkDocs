import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import type { Entity, EntityType, Relation } from './types';

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
