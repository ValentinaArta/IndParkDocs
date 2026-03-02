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
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
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

module.exports = router;
