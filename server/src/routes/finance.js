const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { authenticate } = require('../middleware/auth');

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

module.exports = router;
