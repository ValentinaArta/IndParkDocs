export interface Entity {
  id: number;
  entity_type_id: number;
  entity_type_name: string;
  name: string;
  properties: Record<string, unknown>;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

export interface EntityType {
  id: number;
  name: string;
  name_ru: string;
  icon: string;
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
