const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { authenticate } = require('../middleware/auth');
const pool = require('../db');
const logger = require('../logger');

const ODATA_BASE = process.env.ODATA_BASE_URL || 'http://192.168.2.3/BF/odata/standard.odata';
const ODATA_AUTH = 'Basic ' + Buffer.from((process.env.ODATA_USER || '') + ':' + (process.env.ODATA_PASS || '')).toString('base64');

const ORG_IPZ = process.env.ORG_GUID_IPZ || '1df6218d-8996-11e8-b18d-001e67301201';
const ORG_EKZ = process.env.ORG_GUID_EKZ || '6bf16c76-8993-11e8-b18d-001e67301201';
const ORG_NAMES = { [ORG_IPZ]: 'ИПЗ', [ORG_EKZ]: 'ЭКЗ' };

// Simple in-memory cache (TTL 5 min)
const _cache = {};
function cacheGet(key) {
  const e = _cache[key];
  return (e && Date.now() - e.ts < 5 * 60 * 1000) ? { val: e.val, ts: e.ts } : null;
}
function cacheSet(key, val) { _cache[key] = { ts: Date.now(), val }; }

function odataGet(path) {
  return new Promise((resolve, reject) => {
    const url = `${ODATA_BASE}/${path}`;
    const req = http.get(url, { headers: { 'Authorization': ODATA_AUTH } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse error: ' + data.slice(0,200))); }
      });
    });
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// Fetch all pages from OData (handles $skip pagination automatically)
async function odataGetAll(basePath, pageSize = 1000) {
  const all = [];
  let skip = 0;
  const sep = basePath.includes('?') ? '&' : '?';
  while (true) {
    const page = await odataGet(`${basePath}${sep}$top=${pageSize}&$skip=${skip}`);
    const items = page.value || [];
    all.push(...items);
    if (items.length < pageSize) break;
    skip += pageSize;
  }
  return all;
}

function sumByOrg(items, field = 'СуммаДокумента') {
  const result = { ipz: 0, ekz: 0, other: 0 };
  for (const x of items) {
    if (!x.Posted) continue;
    const s = parseFloat(x[field]) || 0;
    const org = x.Организация_Key || '';
    if (org === ORG_IPZ) result.ipz += s;
    else if (org === ORG_EKZ) result.ekz += s;
    else result.other += s;
  }
  return result;
}

function fmtMonth(d) {
  return d.slice(0, 7); // YYYY-MM
}

// GET /api/finance/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const dateFrom = req.query.from || '2026-01-01';
    const dateTo   = req.query.to   || '';
    const fromPart = `Date gt datetime'${dateFrom}T00:00:00'`;
    const toPart   = dateTo ? ` and Date lt datetime'${dateTo}T23:59:59'` : '';
    const encoded  = encodeURIComponent(fromPart + toPart);

    const [incoming, outgoing, revenue, invoices] = await Promise.all([
      odataGet(`Document_ПоступлениеНаРасчетныйСчет?$format=json&$top=500&$filter=${encoded}&$select=Date,СуммаДокумента,Организация_Key,НазначениеПлатежа,Posted`),
      odataGet(`Document_СписаниеСРасчетногоСчета?$format=json&$top=500&$filter=${encoded}&$select=Date,СуммаДокумента,Организация_Key,НазначениеПлатежа,Posted`),
      odataGet(`Document_РеализацияТоваровУслуг?$format=json&$top=500&$filter=${encoded}&$select=Date,СуммаДокумента,Организация_Key,Posted`),
      odataGet(`Document_СчетНаОплатуПокупателю?$format=json&$top=200&$filter=${encoded}&$select=Date,Number,СуммаДокумента,Организация_Key,Posted`),
    ]);

    const inItems = incoming.value || [];
    const outItems = outgoing.value || [];
    const revItems = revenue.value || [];
    const invItems = invoices.value || [];

    // Totals
    const inSum = sumByOrg(inItems);
    const outSum = sumByOrg(outItems);
    const revSum = sumByOrg(revItems);
    const invSum = sumByOrg(invItems);

    // Monthly breakdown for charts (incoming)
    const monthlyIn = {};
    for (const x of inItems) {
      if (!x.Posted) continue;
      const m = fmtMonth(x.Date || '');
      if (!m) continue;
      if (!monthlyIn[m]) monthlyIn[m] = { ipz: 0, ekz: 0 };
      const org = x.Организация_Key || '';
      if (org === ORG_IPZ) monthlyIn[m].ipz += x.СуммаДокумента || 0;
      else if (org === ORG_EKZ) monthlyIn[m].ekz += x.СуммаДокумента || 0;
    }

    // Monthly revenue
    const monthlyRev = {};
    for (const x of revItems) {
      if (!x.Posted) continue;
      const m = fmtMonth(x.Date || '');
      if (!m) continue;
      if (!monthlyRev[m]) monthlyRev[m] = { ipz: 0, ekz: 0 };
      const org = x.Организация_Key || '';
      if (org === ORG_IPZ) monthlyRev[m].ipz += x.СуммаДокумента || 0;
      else if (org === ORG_EKZ) monthlyRev[m].ekz += x.СуммаДокумента || 0;
    }

    // Recent invoices list
    const recentInvoices = invItems
      .filter(x => x.Posted)
      .sort((a, b) => (b.Date || '').localeCompare(a.Date || ''))
      .slice(0, 20)
      .map(x => ({
        date: (x.Date || '').slice(0, 10),
        number: x.Number || '',
        amount: Math.round(x.СуммаДокумента || 0),
        org: ORG_NAMES[x.Организация_Key] || '—',
      }));

    // Recent payments list
    const recentPayments = inItems
      .filter(x => x.Posted && (x.Организация_Key === ORG_IPZ || x.Организация_Key === ORG_EKZ))
      .sort((a, b) => (b.Date || '').localeCompare(a.Date || ''))
      .slice(0, 20)
      .map(x => ({
        date: (x.Date || '').slice(0, 10),
        amount: Math.round(x.СуммаДокумента || 0),
        org: ORG_NAMES[x.Организация_Key] || '—',
        note: (x.НазначениеПлатежа || '').slice(0, 80),
      }));

    res.json({
      period: dateFrom,
      period_to: dateTo || '',
      totals: {
        incoming: { ipz: Math.round(inSum.ipz), ekz: Math.round(inSum.ekz) },
        outgoing: { ipz: Math.round(outSum.ipz), ekz: Math.round(outSum.ekz) },
        revenue: { ipz: Math.round(revSum.ipz), ekz: Math.round(revSum.ekz) },
        invoices: { ipz: Math.round(invSum.ipz), ekz: Math.round(invSum.ekz) },
      },
      monthly_incoming: monthlyIn,
      monthly_revenue: monthlyRev,
      recent_invoices: recentInvoices,
      recent_payments: recentPayments,
      data_as_of: new Date().toISOString(),
    });
  } catch (e) {
    logger.error('Finance summary error:', e.message);
    res.status(503).json({ error: '1С недоступна: ' + e.message });
  }
});

// GET /api/finance/overdue — unpaid invoices analysis
router.get('/overdue', authenticate, async (req, res) => {
  try {
    const today = new Date();
    const orgKey = req.query.org || ORG_IPZ;
    const cacheKey = `overdue_${orgKey}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ ...cached.val, data_as_of: today.toISOString(), cached: true, cached_at: new Date(cached.ts).toISOString() });

    const dateFilter = encodeURIComponent("Date gt datetime'2025-01-01T00:00:00'");
    const payFilter  = encodeURIComponent("Date gt datetime'2025-01-01T00:00:00' and ВидОперации eq 'ОплатаПокупателя'");

    // Правильная логика (ОСВ по сч.62):
    //   Реализация ТУ  → Дт62 (нам должны за оказанные услуги)
    //   ОплатаПокупателя → Кт62 (они заплатили, долг гасится)
    //   Дебиторка = sum(реализация) - sum(оплаты) per contractor
    const [allRealize, allPayments, contractorsRaw] = await Promise.all([
      odataGetAll(`Document_РеализацияТоваровУслуг?$format=json&$filter=${dateFilter}&$select=Date,Number,СуммаДокумента,Организация_Key,Контрагент_Key,ДоговорКонтрагента_Key,Posted`),
      odataGetAll(`Document_ПоступлениеНаРасчетныйСчет?$format=json&$filter=${payFilter}&$select=Date,СуммаДокумента,Организация_Key,Контрагент,Posted`),
      odataGet(`Catalog_Контрагенты?$format=json&$top=3000&$select=Ref_Key,Description`),
    ]);

    const realItems = allRealize.filter(x => x.Posted && x.Организация_Key === orgKey);
    const payItems  = allPayments.filter(x => x.Posted && x.Организация_Key === orgKey);
    const nameMap = {};
    (contractorsRaw.value || []).forEach(x => { nameMap[x.Ref_Key] = x.Description; });

    // Загружаем справочник договоров 1С (все, без фильтра — небольшой справочник)
    const contractNumMap = {}; // guid → короткий номер
    try {
      const contractsData = await odataGetAll(
        `Catalog_ДоговорыКонтрагентов?$format=json&$filter=DeletionMark%20eq%20false%20and%20IsFolder%20eq%20false&$select=Ref_Key,Номер,Description`,
        500
      );
      contractsData.forEach(c => {
        contractNumMap[c.Ref_Key] = c.Номер || c.Description || '';
      });
    } catch (_) { /* не критично — продолжаем без номеров договоров */ }

    // Реализация по контрагентам (Дт62)
    const realByContr = {};
    for (const x of realItems) {
      const cid = x.Контрагент_Key || '';
      if (!cid) continue;
      if (!realByContr[cid]) realByContr[cid] = { accrued: 0, acts: [] };
      realByContr[cid].accrued += x.СуммаДокумента || 0;
      realByContr[cid].acts.push({
        num: x.Number || '',
        date: (x.Date || '').slice(0, 10),
        sum: Math.round(x.СуммаДокумента || 0),
        contract_num: contractNumMap[x.ДоговорКонтрагента_Key] || '',
      });
    }

    // Оплаты по контрагентам (Кт62) — только ОплатаПокупателя
    const payByContr = {};
    for (const x of payItems) {
      const cid = x.Контрагент || '';
      if (!cid) continue;
      payByContr[cid] = (payByContr[cid] || 0) + (x.СуммаДокумента || 0);
    }

    // Дебиторская задолженность = реализовано - оплачено
    const debtors = [];
    for (const [cid, data] of Object.entries(realByContr)) {
      const paid = payByContr[cid] || 0;
      const outstanding = data.accrued - paid;
      if (outstanding < 1000) continue; // нет долга или переплата

      const sortedActs = data.acts.sort((a, b) => b.date.localeCompare(a.date));
      const lastActDate = sortedActs[0]?.date || '';
      const daysSinceLast = lastActDate ? Math.floor((today - new Date(lastActDate)) / 86400000) : 0;

      // Aging по дате актов
      let age0=0, age30=0, age60=0, age90=0;
      for (const act of data.acts) {
        const days = Math.floor((today - new Date(act.date)) / 86400000);
        const ratio = act.sum / data.accrued;
        const share = outstanding * ratio;
        if (days <= 30) age0 += share;
        else if (days <= 60) age30 += share;
        else if (days <= 90) age60 += share;
        else age90 += share;
      }

      // Группировка актов по договору (для drill-down)
      const byContract = {};
      for (const act of data.acts) {
        const cnum = act.contract_num || '—';
        if (!byContract[cnum]) byContract[cnum] = { contract_num: cnum, invoiced: 0, invoice_count: 0, last_date: '' };
        byContract[cnum].invoiced += act.sum;
        byContract[cnum].invoice_count++;
        if (!byContract[cnum].last_date || act.date > byContract[cnum].last_date) byContract[cnum].last_date = act.date;
      }
      const contractsList = Object.values(byContract).sort((a, b) => b.invoiced - a.invoiced);

      debtors.push({
        key: cid,
        name: nameMap[cid] || cid.slice(0, 8) + '...',
        invoiced: Math.round(data.accrued),
        paid: Math.round(paid),
        outstanding: Math.round(outstanding),
        invoice_count: data.acts.length,
        last_invoice_date: lastActDate,
        days_since_last: daysSinceLast,
        contracts: contractsList,
        aging: { d0: Math.round(age0), d30: Math.round(age30), d60: Math.round(age60), d90: Math.round(age90) },
      });
    }

    // Fallback: resolve remaining UUID names individually
    const unresolvedKeys = debtors.filter(d => !nameMap[d.key]).map(d => d.key);
    if (unresolvedKeys.length > 0) {
      await Promise.all(unresolvedKeys.map(async (guid) => {
        try {
          const r = await odataGet(`Catalog_Контрагенты?$format=json&$filter=Ref_Key%20eq%20guid'${guid}'&$select=Description,Ref_Key`);
          const item = (r.value || [])[0];
          if (item && item.Description) nameMap[guid] = item.Description;
        } catch (_) {}
      }));
      for (const d of debtors) {
        if (nameMap[d.key]) d.name = nameMap[d.key];
      }
    }

    debtors.sort((a, b) => b.outstanding - a.outstanding);

    const totalOutstanding = debtors.reduce((s, d) => s + d.outstanding, 0);
    const totalInvoiced = realItems.reduce((s, x) => s + (x.СуммаДокумента || 0), 0);
    const totalPaid = payItems.reduce((s, x) => s + (x.СуммаДокумента || 0), 0);

    // Aging totals
    const aging = debtors.reduce((s, d) => ({
      d0: s.d0 + d.aging.d0,
      d30: s.d30 + d.aging.d30,
      d60: s.d60 + d.aging.d60,
      d90: s.d90 + d.aging.d90,
    }), { d0: 0, d30: 0, d60: 0, d90: 0 });

    const result = {
      org: orgKey,
      org_name: ORG_NAMES[orgKey] || orgKey,
      data_as_of: today.toISOString(),
      totals: {
        outstanding: Math.round(totalOutstanding),
        debtor_count: debtors.length,
        invoiced: Math.round(totalInvoiced),
        paid: Math.round(totalPaid),
      },
      aging,
      debtors,
    };
    cacheSet(cacheKey, result);
    res.json(result);
  } catch (e) {
    logger.error('Finance overdue error:', e.message);
    res.status(503).json({ error: '1С недоступна: ' + e.message });
  }
});

// =============================================================
// GET /api/finance/budget — Blended Forecast (факт+план)
// Query params:
//   type=БДР|БДДС (default: БДР)
//   cfo=ИП        (required)
//   level=0..4    (max level to return, default: 3)
// =============================================================
const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

router.get('/budget', authenticate, async (req, res) => {
  const { type = 'БДР', cfo, level: maxLevelStr = '3' } = req.query;
  const maxLevel = parseInt(maxLevelStr);

  if (!cfo) return res.status(400).json({ error: 'cfo required' });

  try {
    const rows = await pool.query(
      'SELECT article, level, fact, plan, total_fact, total_plan FROM budget_data WHERE budget_type=$1 AND cfo=$2 AND level<=$3 ORDER BY id',
      [type, cfo, maxLevel]
    );

    if (rows.rows.length === 0) {
      return res.status(404).json({ error: `Нет данных для ${type} / ${cfo}` });
    }

    // Текущий месяц (0-based). Факт — прошлые месяцы (< currentMonth), план — текущий + будущие.
    const now = new Date();
    const currentMonth = now.getMonth(); // 0=Янв, 1=Фев, 2=Мар...

    const months = MONTHS_RU.map((m, i) => ({
      name: m + ' 2026',
      idx: i,
      is_past: i < currentMonth,
      is_current: i === currentMonth,
    }));

    const data = rows.rows.map(r => {
      const fact = r.fact || Array(12).fill(null);
      const plan = r.plan || Array(12).fill(null);

      // Blended: прошлые — факт, текущий и будущие — план
      const blended = fact.map((f, i) =>
        i < currentMonth ? (f || 0) : (plan[i] || 0)
      );
      const blendedTotal = blended.reduce((s, v) => s + v, 0);
      const planTotal = plan.reduce((s, v) => s + (v || 0), 0);
      const deviation = blendedTotal - planTotal;
      const deviationPct = planTotal !== 0 ? (deviation / Math.abs(planTotal)) * 100 : null;

      return {
        article: r.article,
        level: r.level,
        fact: fact.map(v => v !== null ? Math.round(v) : null),
        plan: plan.map(v => v !== null ? Math.round(v) : null),
        blended: blended.map(v => Math.round(v)),
        blended_total: Math.round(blendedTotal),
        plan_total: Math.round(planTotal),
        fact_total: r.total_fact !== null ? Math.round(r.total_fact) : null,
        deviation: Math.round(deviation),
        deviation_pct: deviationPct !== null ? Math.round(deviationPct * 10) / 10 : null,
      };
    });

    res.json({
      budget_type: type,
      cfo,
      current_month: currentMonth,
      months,
      data,
      cfos_available: (await pool.query(
        'SELECT DISTINCT cfo FROM budget_data WHERE budget_type=$1 ORDER BY cfo', [type]
      )).rows.map(r => r.cfo),
    });
  } catch (e) {
    logger.error('Budget error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// =============================================================
// GET /api/finance/budget/rent-drilldown
// Детализация реализации по контрагентам из 1С за прошедшие месяцы
// Сопоставляет с договорами аренды в IndParkDocs
// =============================================================
router.get('/budget/rent-drilldown', authenticate, async (req, res) => {
  const cacheKey = 'rent_drilldown_ipz';
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached.val, cached: true, cached_at: new Date(cached.ts).toISOString() });

  try {
    const ORG = ORG_IPZ;
    const now = new Date();
    const year = now.getFullYear();
    const curMonth = now.getMonth(); // 0-based

    // Определяем период: прошедшие месяцы текущего года
    const dateFrom = `${year}-01-01T00:00:00`;
    const dateTo   = new Date(year, curMonth, 1).toISOString().slice(0,10) + 'T00:00:00';

    // Список месяцев для разбивки
    const pastMonths = [];
    for (let m = 0; m < curMonth; m++) {
      const from = `${year}-${String(m+1).padStart(2,'0')}-01T00:00:00`;
      const nextM = m + 1;
      const toY = nextM > 11 ? year+1 : year;
      const toM = nextM > 11 ? 1 : nextM + 1;
      const to = `${toY}-${String(toM).padStart(2,'0')}-01T00:00:00`;
      pastMonths.push({ idx: m, name: MONTHS_RU[m], from, to });
    }

    if (pastMonths.length === 0) {
      return res.json({ months: [], contractors: [], total: 0 });
    }

    // Фетч реализации за весь период
    const filter = encodeURIComponent(
      `Date gt datetime'${dateFrom}' and Date lt datetime'${dateTo}' and Posted eq true and Организация_Key eq guid'${ORG}'`
    );
    const docs = await odataGetAll(
      `Document_РеализацияТоваровУслуг?$format=json&$filter=${filter}&$select=Date,СуммаДокумента,Контрагент_Key`,
      500
    );

    // Агрегация по контрагенту и месяцу
    const byContr = {};
    for (const doc of docs) {
      const k = doc.Контрагент_Key;
      const m = new Date(doc.Date).getMonth();
      if (!byContr[k]) byContr[k] = { key: k, months: Array(12).fill(0), total: 0 };
      byContr[k].months[m] += doc.СуммаДокумента || 0;
      byContr[k].total    += doc.СуммаДокумента || 0;
    }

    // Резолвим имена контрагентов
    const allKeys = Object.keys(byContr);
    const cats = await odataGetAll(`Catalog_Контрагенты?$format=json&$top=3000&$select=Ref_Key,Description`, 3000);
    const nameMap = {};
    for (const c of cats) nameMap[c.Ref_Key] = c.Description;

    // Читаем договоры аренды из IndParkDocs (ИПЗ) + компании с odata_ref_key
    const contractsRes = await pool.query(`
      SELECT e.id, e.name,
             e.properties->>'contractor_name' AS tenant,
             e.properties->>'contractor_id'   AS contractor_entity_id,
             e.properties->>'contract_type'   AS ctype,
             e.properties->>'rent_objects'     AS rent_objects_raw
      FROM entities e
      JOIN entity_types et ON et.id = e.entity_type_id
      WHERE et.name = 'contract'
        AND e.properties->>'contract_type' IN ('Аренды','Субаренды')
        AND (e.properties->>'our_legal_entity' ILIKE '%Индустриальный%'
          OR e.properties->>'our_legal_entity' ILIKE '%ИПЗ%')
    `);
    const contracts = contractsRes.rows;

    // Загружаем company-сущности с odata_ref_key для точного матчинга
    const companiesRes = await pool.query(`
      SELECT e.id, e.name, e.properties->>'odata_ref_key' AS ref_key
      FROM entities e
      JOIN entity_types et ON et.id = e.entity_type_id
      WHERE et.name = 'company'
        AND e.properties->>'odata_ref_key' IS NOT NULL
    `);
    const companyByRefKey = {};
    for (const c of companiesRes.rows) {
      if (c.ref_key) companyByRefKey[c.ref_key] = c;
    }

    // Матчинг договоров по имени контрагента (fallback)
    function normalize(s) {
      return (s || '').toLowerCase()
        .replace(/\b(ооо|ао|пао|зао|оао|ип|пп|ф-л|филиал)\b/g, '')
        .replace(/[«»"',.()\-]/g, ' ')
        .replace(/\s+/g,' ').trim();
    }
    const contractByNorm = {};
    for (const c of contracts) {
      contractByNorm[normalize(c.tenant)] = c;
    }

    // Собираем итоговый список
    const allContractors = Object.values(byContr)
      .sort((a, b) => b.total - a.total)
      .map(c => {
        const name = nameMap[c.key] || c.key;
        const norm = normalize(name);
        // Матчинг: сначала по odata_ref_key, потом по имени
        const companyEntity = companyByRefKey[c.key] || null;
        const contract = contractByNorm[norm] || null;

        // Ежемесячный план из rent_objects (если договор найден)
        let monthlyPlan = null;
        if (contract && contract.rent_objects_raw) {
          try {
            const ro = JSON.parse(contract.rent_objects_raw);
            if (Array.isArray(ro)) {
              monthlyPlan = ro.reduce((s, obj) => {
                const area = parseFloat(obj.area) || 0;
                const rate = parseFloat(obj.rent_rate) || 0;
                return s + area * rate;
              }, 0);
            }
          } catch(e) {}
        }

        const ytdMonths = pastMonths.map(pm => ({
          name: pm.name,
          fact: Math.round(c.months[pm.idx]),
        }));
        const planYTD = monthlyPlan ? Math.round(monthlyPlan * pastMonths.length) : null;
        const dev = planYTD !== null ? Math.round(c.total - planYTD) : null;

        // Тренд: падение в последнем месяце vs предыдущем
        const lastFact = pastMonths.length >= 1 ? c.months[pastMonths[pastMonths.length - 1].idx] : null;
        const prevFact = pastMonths.length >= 2 ? c.months[pastMonths[pastMonths.length - 2].idx] : null;
        const trendDrop = (lastFact !== null && prevFact !== null && prevFact > 10000)
          ? Math.round(lastFact - prevFact) : null;
        const trendPct  = trendDrop !== null ? Math.round((trendDrop / prevFact) * 100) : null;

        return {
          key: c.key, name,
          total: Math.round(c.total),
          months: ytdMonths,
          company_id:    companyEntity?.id   || null,
          contract_id:   contract?.id   || null,
          contract_name: contract?.name || null,
          monthly_plan: monthlyPlan ? Math.round(monthlyPlan) : null,
          plan_ytd: planYTD,
          deviation: dev,
          trend_drop: trendDrop,
          trend_pct:  trendPct,
        };
      });

    // Фильтруем только тех кто создаёт отклонение:
    // 1. Есть договор И платит меньше плана
    // 2. Есть резкое падение в последнем месяце (> -15%)
    const result = allContractors.filter(c =>
      (c.deviation !== null && c.deviation < -50000) ||  // ниже плана по договору
      (c.trend_pct !== null && c.trend_pct < -15 && Math.abs(c.trend_drop) > 100000) // падение > 15% и > 100к
    ).sort((a, b) => {
      // Сначала те у кого отклонение от договора, потом тренд
      const aScore = (a.deviation ?? 0) + (a.trend_drop ?? 0);
      const bScore = (b.deviation ?? 0) + (b.trend_drop ?? 0);
      return aScore - bScore; // хуже — выше
    }).slice(0, 10);

    const response = {
      period: `${MONTHS_RU[0]}–${MONTHS_RU[curMonth-1]} ${year}`,
      months: pastMonths.map(m => m.name),
      contractors: result,
      total: Math.round(result.reduce((s, r) => s + r.total, 0)),
    };

    cacheSet(cacheKey, response);
    res.json(response);
  } catch(e) {
    logger.error('Rent drilldown error:', e.message);
    res.status(503).json({ error: e.message });
  }
});

// GET /api/finance/budget/meta — список доступных ЦФО по типу бюджета
router.get('/budget/meta', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT budget_type, array_agg(DISTINCT cfo ORDER BY cfo) as cfos
       FROM budget_data GROUP BY budget_type`
    );
    const meta = {};
    for (const row of r.rows) meta[row.budget_type] = row.cfos;
    res.json(meta);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/finance/expenses — фактические расходы 1С vs бюджет (ИПЗ и ЭКЗ)
router.get('/expenses', authenticate, async (req, res) => {
  const cacheKey = 'expenses_all';
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached.val, cached: true, cached_at: new Date(cached.ts).toISOString() });

  try {
    const dateFilter = encodeURIComponent("Date gt datetime'2026-01-01T00:00:00' and Posted eq true");

    // Загружаем параллельно: расходы, справочники, бюджет
    const [expensesRaw, contractorsRaw, contractsRaw] = await Promise.all([
      odataGetAll(`Document_ПоступлениеТоваровУслуг?$format=json&$filter=${dateFilter}&$select=Date,Number,СуммаДокумента,Организация_Key,Контрагент_Key,ДоговорКонтрагента_Key,ВидОперации`),
      odataGet(`Catalog_Контрагенты?$format=json&$top=3000&$select=Ref_Key,Description`),
      odataGetAll(`Catalog_ДоговорыКонтрагентов?$format=json&$filter=${encodeURIComponent("DeletionMark eq false and IsFolder eq false")}&$select=Ref_Key,Номер,Description`, 500),
    ]);

    // Словари
    const nameMap = {};
    (contractorsRaw.value || []).forEach(c => { nameMap[c.Ref_Key] = c.Description; });
    const contractNumMap = {};
    contractsRaw.forEach(c => { contractNumMap[c.Ref_Key] = c.Номер || c.Description || ''; });

    // Бюджет расходов (БДР) из БД
    const budgetRes = await pool.query(`
      SELECT cfo, article, level, plan
      FROM budget_data
      WHERE budget_type = 'БДР'
        AND cfo IN ('ИП', 'ЭК')
        AND level IN (0, 2)
      ORDER BY cfo, level, article
    `);

    // Группируем расходы по org → month → contractors
    const MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    const curMonth = new Date().getMonth(); // 0-based

    // Маппинг org → cfo
    const orgToCfo = { [ORG_IPZ]: 'ИП', [ORG_EKZ]: 'ЭК' };

    const byOrg = { 'ИП': {}, 'ЭК': {} };
    // byOrg[cfo][contractorKey] = { name, contractNum, contractKey, monthly[12], total }

    for (const x of expensesRaw) {
      const cfo = orgToCfo[x.Организация_Key];
      if (!cfo) continue;
      const cid = x.Контрагент_Key || '';
      if (!cid) continue;
      const m = x.Date ? new Date(x.Date).getMonth() : -1;
      if (m < 0 || m > 11) continue;
      const amt = x.СуммаДокумента || 0;

      if (!byOrg[cfo][cid]) {
        byOrg[cfo][cid] = {
          name: nameMap[cid] || cid.slice(0, 8) + '...',
          contractData: {},  // contractNum → { monthly[], total }
          monthly: new Array(12).fill(0),
          total: 0,
        };
      }
      const ck = x.ДоговорКонтрагента_Key;
      const cnum = (ck && ck !== '00000000-0000-0000-0000-000000000000' && contractNumMap[ck])
        ? contractNumMap[ck] : '—';
      if (!byOrg[cfo][cid].contractData[cnum]) {
        byOrg[cfo][cid].contractData[cnum] = { monthly: new Array(12).fill(0), total: 0 };
      }
      byOrg[cfo][cid].contractData[cnum].monthly[m] += amt;
      byOrg[cfo][cid].contractData[cnum].total += amt;
      byOrg[cfo][cid].monthly[m] += amt;
      byOrg[cfo][cid].total += amt;
    }

    // Собираем помесячные итоги факта по ИП и ЭК
    const monthlyFact = { 'ИП': new Array(12).fill(0), 'ЭК': new Array(12).fill(0) };
    for (const [cfo, contractors] of Object.entries(byOrg)) {
      for (const c of Object.values(contractors)) {
        c.monthly.forEach((v, i) => { monthlyFact[cfo][i] += v; });
      }
    }

    // Бюджет РАСХОДОВ (раздел level=2 с "РАСХОДЫ" в названии)
    const budgetPlan = { 'ИП': {}, 'ЭК': {} };
    const totalPlan = { 'ИП': 0, 'ЭК': 0 };
    const expArticles = { 'ИП': [], 'ЭК': [] };

    for (const row of budgetRes.rows) {
      const cfo = row.cfo;
      const plan = row.plan || new Array(12).fill(0);
      const totalP = plan.reduce ? plan.reduce((s, v) => s + (v || 0), 0) : 0;

      if (row.level === 0) {
        // итоговая строка ЦФО (содержит весь план — доходы и расходы)
        continue;
      }
      if (row.level === 2 && row.article.includes('РАСХОДЫ')) {
        const totalPAbs = Math.abs(totalP); // расходы в БДР отрицательные
        totalPlan[cfo] += totalPAbs;
        expArticles[cfo].push({
          name: row.article.replace(/^-/, '').trim(),
          plan: totalPAbs,
          fact: 0,
        });
        plan.forEach((v, i) => {
          if (!budgetPlan[cfo][i]) budgetPlan[cfo][i] = 0;
          budgetPlan[cfo][i] += Math.abs(v || 0); // берём модуль
        });
      }
    }

    // Считаем factYTD (факт за прошедшие месяцы)
    function ytd(arr) { return arr.slice(0, curMonth).reduce((s, v) => s + v, 0); }
    function planYTD(arr) { return Object.values(arr).slice(0, curMonth).reduce((s, v) => s + (v || 0), 0); }

    // Топ контрагентов (сортируем по total desc)
    const topContractors = {};
    for (const cfo of ['ИП', 'ЭК']) {
      topContractors[cfo] = Object.values(byOrg[cfo])
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)
        .map(c => {
          const breakdown = Object.entries(c.contractData)
            .map(([cnum, d]) => ({ contract_num: cnum, monthly: d.monthly, total: Math.round(d.total) }))
            .sort((a, b) => b.total - a.total);
          return {
            name: c.name,
            contracts: breakdown.map(b => b.contract_num).filter(n => n !== '—').join(', ') || '—',
            contractBreakdown: breakdown,
            monthly: c.monthly,
            total: Math.round(c.total),
          };
        });
    }

    // Формируем месячные данные для графика
    const months = MONTHS.map((name, i) => ({
      name,
      isPast: i < curMonth,
      fact: { 'ИП': Math.round(monthlyFact['ИП'][i]), 'ЭК': Math.round(monthlyFact['ЭК'][i]) },
      plan: { 'ИП': Math.round(budgetPlan['ИП'][i] || 0), 'ЭК': Math.round(budgetPlan['ЭК'][i] || 0) },
    }));

    const result = {
      months,
      kpi: {
        'ИП': {
          fact_ytd: Math.round(ytd(monthlyFact['ИП'])),
          plan_ytd: Math.round(Object.values(budgetPlan['ИП']).slice(0, curMonth).reduce((s, v) => s + v, 0)),
          plan_year: Math.round(totalPlan['ИП']),
          forecast: Math.round(ytd(monthlyFact['ИП']) + Object.values(budgetPlan['ИП']).slice(curMonth).reduce((s, v) => s + v, 0)),
        },
        'ЭК': {
          fact_ytd: Math.round(ytd(monthlyFact['ЭК'])),
          plan_ytd: Math.round(Object.values(budgetPlan['ЭК']).slice(0, curMonth).reduce((s, v) => s + v, 0)),
          plan_year: Math.round(totalPlan['ЭК']),
          forecast: Math.round(ytd(monthlyFact['ЭК']) + Object.values(budgetPlan['ЭК']).slice(curMonth).reduce((s, v) => s + v, 0)),
        },
      },
      contractors: topContractors,
    };

    cacheSet(cacheKey, result);
    res.json(result);
  } catch (e) {
    logger.error('Finance expenses error:', e.message);
    res.status(503).json({ error: e.message });
  }
});

module.exports = router;
