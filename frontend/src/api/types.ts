export interface Entity {
  id: number;
  entity_type_id: number;
  entity_type_name?: string;
  name: string;
  properties: Record<string, unknown>;
  parent_id?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  type_name: string;
  type_name_ru: string;
  icon?: string;
  color?: string;
  parent_name?: string | null;
  effective_amount?: string | null;
  effective_our_legal_entity?: string | null;
  effective_contractor_name?: string | null;
  effective_contract_type?: string | null;
  located_in_names?: string | null;
  land_plot_name?: string | null;
  buildings_on_plot?: string | null;
  equipment_tenant?: string | null;
}

export interface EntityType {
  id: number;
  name: string;
  name_ru: string;
  icon: string;
  color?: string;
  sort_order?: number;
}

export interface Note {
  id: number;
  title: string;
  content_json: NoteBlock[];
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface NoteListItem {
  id: number;
  title: string;
  updated_at: string;
  created_at: string;
}

export type NoteBlock =
  | { type: 'text'; value: string }
  | { type: 'drawing'; dataUrl: string }
  | { type: 'image'; dataUrl: string };

export interface Relation {
  id: number;
  source_id: number;
  target_id: number;
  relation_type: string;
  source_name?: string;
  target_name?: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
  display_name: string;
}

export interface FieldDefinition {
  id: number;
  name: string;
  name_ru: string;
  field_type: string;
  required: boolean;
  options: string[];
  sort_order?: number;
}

export interface DetailRel {
  id: number;
  relation_type: string;
  from_entity_id: number;
  to_entity_id: number;
  from_name?: string;
  to_name?: string;
  from_type_name?: string;
  to_type_name?: string;
  from_parent_id?: number | null;
  to_parent_id?: number | null;
}
