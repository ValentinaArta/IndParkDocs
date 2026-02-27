const xss = require('xss');

function cleanValue(val) {
  if (typeof val === 'string') return xss(val);
  if (Array.isArray(val)) return val.map(cleanValue);
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      clean[k] = cleanValue(v);
    }
    return clean;
  }
  return val;
}

function xssClean(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanValue(req.body);
  }
  next();
}

module.exports = xssClean;
