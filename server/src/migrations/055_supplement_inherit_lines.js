'use strict';
/**
 * Migration 055: Retroactively inherit line items for supplements that have none.
 * For each supplement without rows in contract_line_items / rent_items / contract_equipment,
 * copy rows from the effective source (latest earlier supplement with rows, or contract).
 */
module.exports = async function migrate055(pool) {
  // Get all supplements ordered by contract and date
  const { rows: supps } = await pool.query(`
    SELECT s.id, s.parent_id,
           s.properties->>'contract_date' AS supp_date
    FROM entities s
    JOIN entity_types et ON et.id = s.entity_type_id AND et.name = 'supplement'
    WHERE s.deleted_at IS NULL AND s.parent_id IS NOT NULL
    ORDER BY s.parent_id, s.properties->>'contract_date' ASC NULLS FIRST, s.id ASC
  `);

  const tables = [
    { table: 'contract_line_items', fk: 'contract_id',
      cols: 'name,unit,quantity,price,amount,sort_order,charge_type,payment_date,frequency' },
    { table: 'rent_items', fk: 'contract_id',
      cols: 'entity_id,object_type,area,rent_rate,net_rate,utility_rate,calc_mode,comment,sort_order' },
    { table: 'contract_equipment', fk: 'contract_id',
      cols: 'equipment_id,rent_cost,sort_order' },
  ];

  let totalCopied = 0;

  // Group supplements by parent contract
  const byContract = {};
  for (const s of supps) {
    if (!byContract[s.parent_id]) byContract[s.parent_id] = [];
    byContract[s.parent_id].push(s);
  }

  for (const [contractId, contractSupps] of Object.entries(byContract)) {
    for (const tbl of tables) {
      // Track the effective source: starts with the contract itself
      let effectiveSrc = parseInt(contractId);

      for (const supp of contractSupps) {
        // Check if this supplement has its own rows
        const { rows: [cnt] } = await pool.query(
          `SELECT COUNT(*)::int AS c FROM ${tbl.table} WHERE ${tbl.fk} = $1`, [supp.id]
        );

        if (cnt.c > 0) {
          // This supplement has its own rows — it becomes the effective source
          effectiveSrc = supp.id;
        } else {
          // No rows — copy from effective source
          const { rows: srcRows } = await pool.query(
            `SELECT ${tbl.cols} FROM ${tbl.table} WHERE ${tbl.fk} = $1 ORDER BY sort_order`, [effectiveSrc]
          );
          if (srcRows.length > 0) {
            const colArr = tbl.cols.split(',');
            for (const row of srcRows) {
              const vals = colArr.map(c => row[c]);
              const placeholders = colArr.map((_, i) => `$${i + 2}`).join(',');
              await pool.query(
                `INSERT INTO ${tbl.table} (${tbl.fk},${tbl.cols}) VALUES ($1,${placeholders})`,
                [supp.id, ...vals]
              );
            }
            totalCopied += srcRows.length;
            // Now this supplement has rows too, becomes effective source
            effectiveSrc = supp.id;
          }
        }
      }
    }
  }

  // Also copy cli_equipment_links for newly copied contract_line_items
  // Re-run: find line items that were just copied and link their equipment
  const { rows: newClis } = await pool.query(`
    SELECT cli.id AS new_id, cli.contract_id AS supp_id, cli.name, cli.sort_order,
           s.parent_id AS contract_id
    FROM contract_line_items cli
    JOIN entities s ON s.id = cli.contract_id
    JOIN entity_types et ON et.id = s.entity_type_id AND et.name = 'supplement'
    WHERE NOT EXISTS (SELECT 1 FROM cli_equipment_links cel WHERE cel.cli_id = cli.id)
  `);
  // For each new CLI, find the matching source CLI by name+sort_order and copy equipment links
  for (const nc of newClis) {
    // Find all supplements and contract for this parent, look for matching CLI with equipment
    const { rows: srcLinks } = await pool.query(`
      SELECT cel.equipment_id
      FROM cli_equipment_links cel
      JOIN contract_line_items src_cli ON src_cli.id = cel.cli_id
      WHERE src_cli.name = $1 AND src_cli.sort_order = $2
        AND src_cli.contract_id IN (
          SELECT id FROM entities WHERE parent_id = $3 AND deleted_at IS NULL AND id != $4
          UNION ALL SELECT $3::int
        )
      LIMIT 10
    `, [nc.name, nc.sort_order, nc.contract_id, nc.supp_id]);

    for (const sl of srcLinks) {
      await pool.query(
        `INSERT INTO cli_equipment_links (cli_id, equipment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [nc.new_id, sl.equipment_id]
      );
    }
  }

  console.log(`  [055] Inherited ${totalCopied} line-item rows for supplements without own data`);
};
