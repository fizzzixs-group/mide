// Mide Simulator — общие вещи для serverless-функций Vercel
//
// Игра РАБОТАЕТ БЕЗ КЛЮЧА: диалоги идут по шаблонам.
// Живой ИИ включается, когда игрок вводит свой ключ DeepSeek в настройках игры.
// Ключ хранится только в браузере игрока и приходит сюда в заголовке — на сервере не сохраняется.

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-flash';        // самая дешёвая модель
const MAX_REPLY_TOKENS = 120;
const HISTORY_LIMIT = 8;
const DAILY_TOKENS = 100000;           // на игрока в день
const MONTHLY_TOKENS = 2000000;        // предохранитель на всех
const SELL_TG = 'https://t.me/proxek_sell';   // где купить ключ

// Счётчики в памяти инстанса
const state = { day: '', perUser: {}, month: '', monthTotal: 0 };

function today() {
  // полночь по Москве (UTC+3)
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function roll() {
  const d = today();
  if (state.day !== d) { state.day = d; state.perUser = {}; }
  if (state.month !== d.slice(0, 7)) { state.month = d.slice(0, 7); state.monthTotal = 0; }
}

function limits(uid) {
  roll();
  const used = state.perUser[uid] || 0;
  return {
    ai_enabled: used < DAILY_TOKENS && state.monthTotal < MONTHLY_TOKENS,
    daily_limit: DAILY_TOKENS,
    daily_used: used,
    daily_left: Math.max(0, DAILY_TOKENS - used),
    month_total: state.monthTotal,
    month_limit: MONTHLY_TOKENS,
    month_left: Math.max(0, MONTHLY_TOKENS - state.monthTotal),
    buy_key: SELL_TG,
    model: MODEL
  };
}

function allowed(uid) {
  const l = limits(uid);
  return l.daily_left > 0 && l.month_left > 0;
}

function charge(uid, total) {
  roll();
  state.perUser[uid] = (state.perUser[uid] || 0) + total;
  state.monthTotal += total;
}

// ключ приходит от игрока, на сервере не хранится
function cleanKey(key) {
  const k = String(key || '').trim();
  if (!/^sk-[A-Za-z0-9_\-]{16,}$/.test(k)) return '';
  return k;
}

async function ask(messages, key) {
  const body = {
    model: MODEL,
    messages: messages.slice(-HISTORY_LIMIT),
    temperature: 0.95,
    max_tokens: MAX_REPLY_TOKENS,
    thinking: { type: 'disabled' }
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 22000);
  try {
    const r = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (r.status !== 200) {
      const code = r.status === 401 ? 'bad_key' : r.status === 402 ? 'no_money' : 'deepseek_' + r.status;
      return { error: code };
    }
    const j = await r.json();
    const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim();
    const used = (j.usage && j.usage.total_tokens) || 0;
    return { text, used };
  } catch (e) {
    clearTimeout(timer);
    return { error: 'network' };
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Mide-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function json(res, code, data) {
  cors(res);
  res.status(code).json(data);
}

module.exports = { limits, allowed, charge, ask, cleanKey, json, cors, MODEL, SELL_TG };
