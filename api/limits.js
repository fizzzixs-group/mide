const core = require('./_core');

// Остаток токенов и ссылка на покупку ключа.
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { core.cors(res); return res.status(200).end(); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const uid = String((body && body.uid) || req.query.uid || 'anon').slice(0, 64);
  return core.json(res, 200, core.limits(uid));
};
