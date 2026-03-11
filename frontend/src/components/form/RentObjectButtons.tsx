import { Plus, Building2, DoorOpen, MapPin, MapPinned, Settings, Gauge } from 'lucide-react';

export type RentObjectType = 'building' | 'room' | 'land_plot' | 'land_plot_part' | 'equipment' | 'meter';

export interface RentObjectTypeDef {
  type: RentObjectType;
  label: string;
  icon: typeof Building2;
  entityType: string; // for EntitySearch
}

export const RENT_OBJECT_TYPES: RentObjectTypeDef[] = [
  { type: 'building', label: 'Корпус', icon: Building2, entityType: 'building' },
  { type: 'room', label: 'Помещение', icon: DoorOpen, entityType: 'room' },
  { type: 'land_plot', label: 'ЗУ', icon: MapPin, entityType: 'land_plot' },
  { type: 'land_plot_part', label: 'Часть ЗУ', icon: MapPinned, entityType: 'land_plot_part' },
  { type: 'equipment', label: 'Оборудование', icon: Settings, entityType: 'equipment' },
  { type: 'meter', label: 'Счётчик', icon: Gauge, entityType: 'meter' },
];

/** Default 5 types (without meter) */
export const DEFAULT_OBJECT_TYPES: RentObjectType[] = ['building', 'room', 'land_plot', 'land_plot_part', 'equipment'];

/** All 6 types (with meter) */
export const ALL_OBJECT_TYPES: RentObjectType[] = ['building', 'room', 'land_plot', 'land_plot_part', 'equipment', 'meter'];

export function getRentObjectDef(type: RentObjectType): RentObjectTypeDef {
  return RENT_OBJECT_TYPES.find(t => t.type === type) || RENT_OBJECT_TYPES[1];
}

interface Props {
  onAdd: (type: RentObjectType) => void;
  types?: RentObjectType[];
}

export function RentObjectButtons({ onAdd, types }: Props) {
  const visibleTypes = types
    ? RENT_OBJECT_TYPES.filter(t => types.includes(t.type))
    : RENT_OBJECT_TYPES.filter(t => DEFAULT_OBJECT_TYPES.includes(t.type));

  return (
    <div className="flex gap-2 flex-wrap">
      {visibleTypes.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <Plus size={14} /> {label}
        </button>
      ))}
    </div>
  );
}
