const core = require('./_core');

// Живые диалоги. Ключ игрока приходит в заголовке X-Mide-Key.
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { core.cors(res); return res.status(200).end(); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const uid = String(body.uid || '').slice(0, 64) || 'anon';

  const key = core.cleanKey(req.headers['x-mide-key'] || (body && body.key));
  if (!key) {
    return core.json(res, 402, {
      error: 'no_key',
      message: 'Живой ИИ выключен. Введи ключ в настройках игры или купи у @proxek_sell.',
      buy_key: core.SELL_TG
    });
  }

  if (!core.allowed(uid)) {
    return core.json(res, 429, Object.assign({ error: 'limit' }, core.limits(uid)));
  }

  const msgs = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  const clean = [];
  for (const m of msgs) {
    const role = m && m.role;
    const content = String((m && m.content) || '').slice(0, 600);
    if ((role === 'system' || role === 'user' || role === 'assistant') && content) {
      clean.push({ role, content });
    }
  }
  if (!clean.length) return core.json(res, 400, { error: 'bad_messages' });

  const out = await core.ask(clean, key);
  if (out.error) {
    const msg = out.error === 'bad_key' ? 'Ключ не принят DeepSeek — проверь его в настройках.'
      : out.error === 'no_money' ? 'На ключе закончились средства. Купи новый у @proxek_sell.'
      : 'DeepSeek не ответил, попробуй ещё раз.';
    return core.json(res, 502, { error: out.error, message: msg, buy_key: core.SELL_TG });
  }
  if (!out.text) return core.json(res, 502, { error: 'empty' });

  core.charge(uid, out.used || 0);
  return core.json(res, 200, Object.assign({ content: out.text, usage: out.used || 0 }, core.limits(uid)));
};
