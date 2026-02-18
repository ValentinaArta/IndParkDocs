require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

const SQL = `
-- Entity types (Корпус, Цех, Помещение, Договор, Компания, Оборудование...)
CREATE TABLE IF NOT EXISTS entity_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ru VARCHAR(100),
  icon VARCHAR(10) DEFAULT '📄',
  color VARCHAR(7) DEFAULT '#6366F1',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field definitions per entity type
CREATE TABLE IF NOT EXISTS field_definitions (
  id SERIAL PRIMARY KEY,
  entity_type_id INT NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_ru VARCHAR(100),
  field_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text, number, date, select, boolean
  options JSONB, -- for select: ["active","closed","expired"]
  required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  UNIQUE(entity_type_id, name)
);

-- Entities (all objects)
CREATE TABLE IF NOT EXISTS entities (
  id SERIAL PRIMARY KEY,
  entity_type_id INT NOT NULL REFERENCES entity_types(id),
  name VARCHAR(255) NOT NULL,
  properties JSONB DEFAULT '{}',
  parent_id INT REFERENCES entities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relations between entities
CREATE TABLE IF NOT EXISTS relations (
  id SERIAL PRIMARY KEY,
  from_entity_id INT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id INT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type VARCHAR(100) NOT NULL, -- "арендует", "обслуживает", "расположен в"
  properties JSONB DEFAULT '{}', -- extra data on the relation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_entity_id, to_entity_id, relation_type)
);

-- Relation type definitions
CREATE TABLE IF NOT EXISTS relation_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ru VARCHAR(100),
  from_type_id INT REFERENCES entity_types(id),
  to_type_id INT REFERENCES entity_types(id),
  color VARCHAR(7) DEFAULT '#94A3AF'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type_id);
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_entities_properties ON entities USING GIN(properties);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
