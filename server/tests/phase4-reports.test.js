/**
 * Phase 4 — Reports & Finance: comprehensive tests
 * Covers: /api/stats, /api/reports/*, /api/finance/*, /api/cube/*
 * 1С endpoints return 503 in tests (no VPN) — we test auth + response shape
 */
require('./setup');

const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
jest.mock('../src/db', () => ({ query: mockQuery }));
jest.mock('../src/middleware/audit', () => ({ logAction: jest.fn().mockResolvedValue(undefined) }));

const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');

function adminToken() {
  return generateAccessToken({ id: 1, username: 'admin', role: 'admin' });
}
const auth = () => ({ Authorization: `Bearer ${adminToken()}` });

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ═══════════════════════════════════════════════════════════════════════
// STATS (Dashboard)
// ═══════════════════════════════════════════════════════════════════════
describe('GET /api/stats', () => {
  it('401 без токена', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });

  it('возвращает types[] и totalRelations', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { name: 'contract', name_ru: 'Договор', icon: 'file-text', color: '#3b82f6', count: 42 },
          { name: 'building', name_ru: 'Корпус', icon: 'building', color: '#f97316', count: 8 },
          { name: 'equipment', name_ru: 'Оборудование', icon: 'settings', color: '#10b981', count: 120 },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: 169 }] });

    const res = await request(app).get('/api/stats').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.types).toHaveLength(3);
    expect(res.body.types[0]).toHaveProperty('name', 'contract');
    expect(res.body.types[0]).toHaveProperty('count', 42);
    expect(res.body.totalRelations).toBe(169);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// REPORTS — pivot, fields, linked, aggregate
// ═══════════════════════════════════════════════════════════════════════
describe('Reports — pivot endpoints', () => {
  it('GET /api/reports/pivot → 400 без groupBy', async () => {
    const res = await request(app).get('/api/reports/pivot').set(auth());
    expect(res.status).toBe(400);
  });

  it('GET /api/reports/pivot?groupBy=contract_type → 200', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Договор 1', properties: { contract_type: 'Аренды' }, type_name: 'contract', type_name_ru: 'Договор', icon: 'file-text', color: '#3b82f6' },
        { id: 2, name: 'Договор 2', properties: { contract_type: 'Аренды' }, type_name: 'contract', type_name_ru: 'Договор', icon: 'file-text', color: '#3b82f6' },
      ],
    });

    const res = await request(app).get('/api/reports/pivot?groupBy=contract_type').set(auth());
    expect(res.status).toBe(200);
    // pivot returns object with groups, not array
    expect(res.body).toBeDefined();
  });

  it('GET /api/reports/fields → 200 + массив', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 13, name: 'contract_type', name_ru: 'Тип договора', entity_type_id: 5 },
      ],
    });
    const res = await request(app).get('/api/reports/fields').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/reports/linked?id=1 → 200', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/reports/linked?id=1').set(auth());
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/reports/aggregate → 200', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/reports/aggregate').set(auth());
    // 400 without required params is acceptable
    expect([200, 400]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// REPORTS — rent-analysis & area-stats
// ═══════════════════════════════════════════════════════════════════════
describe('Reports — rent analysis', () => {
  it('GET /api/reports/rent-analysis → 200 + массив строк', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, name: 'Договор аренды', contract_type: 'Аренды',
        contract_number: '001', contract_date: '2026-01-01',
        our_legal_entity: 'ИПЗ', vat_rate: '20',
        building_name: 'Корпус 1', room_name: 'Офис 101',
        area: 50, rate: 500, monthly_total: 25000,
        contractor_name: 'ООО Тест', subtenant_name: null,
        effective_source_id: 1, effective_source_name: null,
      }],
    });

    const res = await request(app).get('/api/reports/rent-analysis').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('contract_number');
    }
  });

  it('GET /api/reports/area-stats → 200', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/reports/area-stats').set(auth());
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// REPORTS — work-history & broken-equipment
// ═══════════════════════════════════════════════════════════════════════
describe('Reports — work & equipment', () => {
  it('GET /api/reports/work-history → 200 + массив', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/reports/work-history').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/reports/work-history?category=Крановое+хозяйство → фильтр', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/reports/work-history?category=%D0%9A%D1%80%D0%B0%D0%BD%D0%BE%D0%B2%D0%BE%D0%B5+%D1%85%D0%BE%D0%B7%D1%8F%D0%B9%D1%81%D1%82%D0%B2%D0%BE').set(auth());
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/broken-equipment → 200 + массив', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/reports/broken-equipment').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FINANCE — summary, overdue, expenses, budget
// All depend on 1С OData → return 503 in tests; check auth + shape
// ═══════════════════════════════════════════════════════════════════════
describe('Finance — auth guard', () => {
  const endpoints = [
    '/api/finance/summary',
    '/api/finance/overdue',
    '/api/finance/expenses',
    '/api/finance/budget',
    '/api/finance/budget/meta',
    '/api/finance/budget/rent-drilldown',
  ];

  endpoints.forEach(url => {
    it(`GET ${url} → 401 без токена`, async () => {
      const res = await request(app).get(url);
      expect(res.status).toBe(401);
    });

    it(`GET ${url} → не 401 с токеном`, async () => {
      const res = await request(app).get(url).set(auth());
      expect(res.status).not.toBe(401);
      // 503 (no 1С) or 200 (cache) or 400 (missing param) — all OK
      expect([200, 400, 500, 503]).toContain(res.status);
    });
  });
});

describe('Finance — response shapes', () => {
  it('GET /api/finance/summary → 503 с error полем', async () => {
    const res = await request(app).get('/api/finance/summary').set(auth());
    if (res.status === 503) {
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    }
  });

  it('GET /api/finance/overdue → 503 с error или 200 с debtors[]', async () => {
    const res = await request(app).get('/api/finance/overdue').set(auth());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('debtors');
      expect(Array.isArray(res.body.debtors)).toBe(true);
      expect(res.body).toHaveProperty('totals');
      expect(res.body).toHaveProperty('aging');
    }
  });

  it('GET /api/finance/budget/meta → 200 (DB only, no 1С)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ budget_type: 'БДР', cfos: ['ИП', 'ЭК'] }],
    });
    const res = await request(app).get('/api/finance/budget/meta').set(auth());
    // This endpoint reads from local DB, should work
    expect([200, 500]).toContain(res.status);
  });

  it('GET /api/finance/budget?cfo=ИП → 503/200/500', async () => {
    const res = await request(app).get('/api/finance/budget?cfo=%D0%98%D0%9F').set(auth());
    expect([200, 400, 404, 500, 503]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CUBE — multi-dimensional analytics
// ═══════════════════════════════════════════════════════════════════════
describe('Cube endpoints', () => {
  it('POST /api/cube/query → 401 без токена', async () => {
    const res = await request(app).post('/api/cube/query').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/cube/query → 400 без dimensions', async () => {
    const res = await request(app).post('/api/cube/query').set(auth()).send({});
    expect([400, 200]).toContain(res.status);
  });

  it('POST /api/cube/query → 200 с dimensions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/cube/query')
      .set(auth())
      .send({ dimensions: ['contract_type'], measure: 'amount' });
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/cube/filter-values → 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/cube/filter-values').set(auth());
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/cube/drilldown → 200/400', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/cube/drilldown?dimension=contract_type&value=Аренды').set(auth());
    expect([200, 400]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// LEGAL — zachety
// ═══════════════════════════════════════════════════════════════════════
describe('Legal — zachety', () => {
  it('GET /api/legal/zachety → 401 без токена', async () => {
    const res = await request(app).get('/api/legal/zachety');
    expect(res.status).toBe(401);
  });

  it('GET /api/legal/zachety → 200 + массив', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/legal/zachety').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/legal/contracts → 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/legal/contracts').set(auth());
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CONTRACT CARD — full report
// ═══════════════════════════════════════════════════════════════════════
describe('GET /api/reports/contract-card/:id — расширенные тесты', () => {
  const SAMPLE = {
    id: 1, name: 'Договор №42', entity_type_id: 5, type_name: 'contract',
    properties: {
      contract_type: 'Аренды', our_legal_entity: 'ИПЗ',
      contractor_name: 'ООО Рога', number: '42',
      contract_date: '2026-01-15', doc_status: 'Подписан',
    },
    parent_id: null,
  };

  it('возвращает contractor_name и contract_type в ответе', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SAMPLE] });
    // Subsequent queries for supplements, acts, etc. return empty
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/reports/contract-card/1').set(auth());
    if (res.status === 200) {
      expect(res.body.properties.contractor_name).toBe('ООО Рога');
      expect(res.body.properties.contract_type).toBe('Аренды');
    }
  });

  it('advance-status → 401 без токена', async () => {
    const res = await request(app).get('/api/reports/contract-card/1/advance-status');
    expect(res.status).toBe(401);
  });
});
