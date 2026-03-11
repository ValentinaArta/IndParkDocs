interface Props {
  durationType: string;
  durationDate: string;
  durationText: string;
  onChange: (name: string, value: string) => void;
}

export function DurationSection({ durationType, durationDate, durationText, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="block text-sm font-medium text-gray-700">Срок действия</label>
        <button type="button"
          onClick={() => onChange('duration_type', durationType ? '' : 'Дата')}
          className="text-xs text-gray-400 hover:text-red-500">
          {durationType ? '× убрать' : '+ добавить'}
        </button>
      </div>

      {durationType && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Тип срока</label>
            <select value={durationType}
              onChange={(e) => onChange('duration_type', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">— выберите —</option>
              <option value="Дата">Дата</option>
              <option value="Текст">Текст</option>
            </select>
          </div>

          {durationType === 'Дата' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата окончания</label>
              <input type="date" value={durationDate}
                onChange={(e) => onChange('duration_date', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          )}

          {durationType === 'Текст' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Срок действия (текст)</label>
              <input type="text" value={durationText}
                onChange={(e) => onChange('duration_text', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Например: до исполнения обязательств" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
