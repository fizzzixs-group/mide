const core = require('./_core');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { core.cors(res); return res.status(200).end(); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  core.json(res, 200, {
    ok: true,
    model: core.MODEL,
    paid_required: false,
    server: 'vercel'
  });
};
