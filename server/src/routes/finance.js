const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { authenticate } = require('../middleware/auth');
const db = require('../db');

const ODATA_BASE = 'http://192.168.2.3/BF/odata/standard.odata';
const ODATA_AUTH = 'Basic ' + Buffer.from('odata.user:gjdbh2642!').toString('base64');

const ORG_IPZ = '1df6218d-8996-11e8-b18d-001e67301201';
const ORG_EKZ = '6bf16c76-8993-11e8-b18d-001e67301201';
const ORG_NAMES = { [ORG_IPZ]: 'ИПЗ', [ORG_EKZ]: 'ЭКЗ' };

// Simple in-memory cache (TTL 5 min)
const _cache = {};
function cacheGet(key) {
  const e = _cache[key];
  return (e && Date.now() - e.ts < 5 * 60 * 1000) ? e.val : null;
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
    const encoded = encodeURIComponent(`Date gt datetime'${dateFrom}T00:00:00'`);

    const [incoming, outgoing, revenue, invoices] = await Promise.all([
      odataGet(`Document_ПоступлениеНаРасчетныйСчет?$format=json&$top=500&$filter=${encoded}&$select=Date,СуммаДокумента,Организация_Key,НазначениеПлатежа,Posted`),
      odataGet(`Document_СписаниеСРасчетногоСчета?$format=json&$top=500&$filter=${encoded}&$select=Date,СуммаДокумента,Организация_Key,НазначениеПлатежа,Posted`),
      odataGet(`Document_РеализацияТоваровУслуг?$format=json&$top=500&$filter=${encoded}&$select=Date,СуммаДокумента,Организация_Key,Posted`),
      odataGet(`Document_СчетНаОплатуПокупателю?$format=json&$top=200&$filter=${encodeURIComponent(`Date gt datetime'2025-01-01T00:00:00'`)}&$select=Date,Number,СуммаДокумента,Организация_Key,Posted`),
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
    console.error('Finance summary error:', e.message);
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
    if (cached) return res.json({ ...cached, data_as_of: today.toISOString(), cached: true });

    const dateFilter = encodeURIComponent("Date gt datetime'2025-01-01T00:00:00'");
    const payFilter  = encodeURIComponent("Date gt datetime'2025-01-01T00:00:00' and ВидОперации eq 'ОплатаПокупателя'");

    // Правильная логика (ОСВ по сч.62):
    //   Реализация ТУ  → Дт62 (нам должны за оказанные услуги)
    //   ОплатаПокупателя → Кт62 (они заплатили, долг гасится)
    //   Дебиторка = sum(реализация) - sum(оплаты) per contractor
    const [allRealize, allPayments, contractorsRaw] = await Promise.all([
      odataGetAll(`Document_РеализацияТоваровУслуг?$format=json&$filter=${dateFilter}&$select=Date,Number,СуммаДокумента,Организация_Key,Контрагент_Key,Posted`),
      odataGetAll(`Document_ПоступлениеНаРасчетныйСчет?$format=json&$filter=${payFilter}&$select=Date,СуммаДокумента,Организация_Key,Контрагент,Posted`),
      odataGet(`Catalog_Контрагенты?$format=json&$top=3000&$select=Ref_Key,Description`),
    ]);

    const realItems = allRealize.filter(x => x.Posted && x.Организация_Key === orgKey);
    const payItems  = allPayments.filter(x => x.Posted && x.Организация_Key === orgKey);
    const nameMap = {};
    (contractorsRaw.value || []).forEach(x => { nameMap[x.Ref_Key] = x.Description; });

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

      debtors.push({
        key: cid,
        name: nameMap[cid] || cid.slice(0, 8) + '...',
        invoiced: Math.round(data.accrued),
        paid: Math.round(paid),
        outstanding: Math.round(outstanding),
        invoice_count: data.acts.length,
        last_invoice_date: lastActDate,
        days_since_last: daysSinceLast,
        top_invoices: sortedActs.slice(0, 5),
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
    console.error('Finance overdue error:', e.message);
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
    const rows = await db.query(
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
      cfos_available: (await db.query(
        'SELECT DISTINCT cfo FROM budget_data WHERE budget_type=$1 ORDER BY cfo', [type]
      )).rows.map(r => r.cfo),
    });
  } catch (e) {
    console.error('Budget error:', e.message);
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
  if (cached) return res.json(cached);

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

    // Читаем договоры аренды из IndParkDocs (ИПЗ)
    const contractsRes = await db.query(`
      SELECT e.id, e.name,
             e.properties->>'contractor_name' AS tenant,
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

    // Простое сопоставление по имени (убираем ООО/АО/ПАО, lowercase)
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
    console.error('Rent drilldown error:', e.message);
    res.status(503).json({ error: e.message });
  }
});

// GET /api/finance/budget/meta — список доступных ЦФО по типу бюджета
router.get('/budget/meta', authenticate, async (req, res) => {
  try {
    const r = await db.query(
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

module.exports = router;
