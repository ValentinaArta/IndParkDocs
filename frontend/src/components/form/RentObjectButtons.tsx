import { Plus, Building2, DoorOpen, MapPin, MapPinned, Settings } from 'lucide-react';

export type RentObjectType = 'building' | 'room' | 'land_plot' | 'land_plot_part' | 'equipment';

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
];

export function getRentObjectDef(type: RentObjectType): RentObjectTypeDef {
  return RENT_OBJECT_TYPES.find(t => t.type === type) || RENT_OBJECT_TYPES[1]; // fallback to room
}

interface Props {
  onAdd: (type: RentObjectType) => void;
}

export function RentObjectButtons({ onAdd }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {RENT_OBJECT_TYPES.map(({ type, label, icon: Icon }) => (
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
