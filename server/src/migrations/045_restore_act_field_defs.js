// Migration 045: Restore missing field_definitions for 'act' entity type.
//
// Migration 005 was supposed to create these fields but silently failed
// (try/catch swallowed the error). As a result act detail pages show only
// doc_status + subject fields, with no act_number, act_date, act_items, etc.
// All INSERTs use ON CONFLICT DO NOTHING so re-running is safe.

module.exports = async function migration045(pool) {
  const { rows } = await pool.query("SELECT id FROM entity_types WHERE name='act'");
  if (!rows.length) { console.log('045: act type not found, skip'); return; }
  const actId = rows[0].id;

  const fields = [
    // sort_order < doc_status(1) → act_number first
    { name: 'act_number',          name_ru: 'Номер акта',       field_type: 'text',       sort_order: 0   },
    // doc_status sits at sort_order 1 (already exists)
    { name: 'act_date',            name_ru: 'Дата акта',        field_type: 'date',       sort_order: 2   },
    { name: 'conclusion',          name_ru: 'Заключение',       field_type: 'textarea',   sort_order: 3   },
    { name: 'act_items',           name_ru: 'Позиции акта',     field_type: 'act_items',  sort_order: 5   },
    { name: 'total_amount',        name_ru: 'Итого по акту',    field_type: 'number',     sort_order: 6   },
    { name: 'comment',             name_ru: 'Комментарий',      field_type: 'textarea',   sort_order: 7   },
    // Internal fields — hidden (sort_order ≥ 999)
    { name: 'parent_contract_id',  name_ru: 'ID договора',      field_type: 'text',       sort_order: 999 },
    { name: 'parent_contract_name',name_ru: 'Договор-основание',field_type: 'text',       sort_order: 999 },
  ];

  for (const f of fields) {
    await pool.query(
      `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entity_type_id, name) DO NOTHING`,
      [actId, f.name, f.name_ru, f.field_type, f.sort_order]
    );
  }

  console.log('045: restored act field_definitions');
};
