const core = require('./_core');

// Проверка ключа игрока: живой он и рабочий ли.
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { core.cors(res); return res.status(200).end(); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const key = core.cleanKey(req.headers['x-mide-key'] || (body && body.key));
  if (!key) return core.json(res, 400, { ok: false, error: 'no_key' });

  const out = await core.ask([{ role: 'user', content: 'Ответь одним словом: работает' }], key);
  if (out.error === 'bad_key') return core.json(res, 200, { ok: false, error: 'bad_key', buy_key: core.SELL_TG });
  if (out.error === 'no_money') return core.json(res, 200, { ok: false, error: 'no_money', buy_key: core.SELL_TG });
  if (out.error) return core.json(res, 200, { ok: false, error: out.error, buy_key: core.SELL_TG });

  return core.json(res, 200, { ok: true, model: core.MODEL, reply: out.text });
};
