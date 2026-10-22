// Sends Telugu tithi, festivals and notes to WhatsApp via Green API (your own WhatsApp, linked by QR code).
// Usage: node daily.js                  morning: today's message (+ the coming week on Sundays)
//        node daily.js --mode=evening   evening: tomorrow's message, only if tomorrow has something
//        node daily.js --dry-run        print the messages, send nothing
//        node daily.js --date=2026-11-08 --dry-run   pretend it is another day (India time)
//        node daily.js --mode=groups    list your WhatsApp groups and their chat IDs
// Settings come from the WHATSAPP secret:
//   {"apiUrl":"https://1234.api.greenapi.com","idInstance":"1101...","apiTokenInstance":"...","chats":["1203...@g.us"]}
const fs = require('fs');
const path = require('path');
global.Panchang = require('./engine.js');
const F = require('./festivals.js');
const P = Panchang;

const CITIES = {
  hyd: { name: 'Hyderabad', lat: 17.385, lon: 78.4867, tz: 5.5 },
  vij: { name: 'Vijayawada', lat: 16.5062, lon: 80.648, tz: 5.5 },
  vsk: { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, tz: 5.5 },
  wgl: { name: 'Warangal', lat: 17.9689, lon: 79.5941, tz: 5.5 },
  tpt: { name: 'Tirupati', lat: 13.6288, lon: 79.4192, tz: 5.5 },
  blr: { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, tz: 5.5 },
  chn: { name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 5.5 },
};
const OCC = { 'Birthday': 'పుట్టినరోజు', 'Wedding anniversary': 'పెళ్లిరోజు', 'Aabdikam': 'ఆబ్దికం', 'Other': 'ఇతర' };
const OCC_TODO = {
  'Birthday': ['Oil bath and new clothes', 'Temple visit or archana in their name', 'Blessings from elders'],
  'Wedding anniversary': ['Temple visit together', 'Blessings from elders'],
  'Aabdikam': ['Shraddham with the family purohit', 'Pinda pradanam and tarpanam', 'Feed Brahmins or give food in charity'],
  'Other': [],
};
const VAARAM = ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dateArg = (args.find(a => a.startsWith('--date=')) || '').slice(7);
const mode = (args.find(a => a.startsWith('--mode=')) || '--mode=morning').slice(7);

// Family dates and notes exported from the Tithi Reminders page
const dataFile = path.join(__dirname, 'data', 'tithi-data.json');
const data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
const family = Array.isArray(data.family) ? data.family : [];
const notes = Array.isArray(data.notes) ? data.notes : [];
const loc = CITIES[data.city] || CITIES.hyd;

const wd = ([y, m, d]) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const same = (a, b) => a.join('-') === b.join('-');
function todayIST() {
  if (dateArg) return dateArg.split('-').map(Number);
  const d = new Date(Date.now() + 5.5 * 3600000);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}
function tithiLabel(masa, tithi, adhika) {
  const t = P.tithiName(tithi), full = tithi === 15 || tithi === 30;
  return `${adhika ? 'అధిక ' : ''}${P.MASAS_TE[masa]} ${full ? '' : (tithi <= 15 ? 'శుక్ల ' : 'బహుళ ')}${t.te}`;
}
const notesFor = target => notes.filter(n => n.target === target).map(n => n.text);

// Same rules as the page: festivals by their own timing, notes by the day's sunrise tithi
function itemsOn(ymd) {
  const info = P.dayInfo(...ymd, loc);
  const items = [];
  for (const ev of family) {
    if (P.occurrences(ev.masa, ev.tithi, ymd[0], ymd[0], loc).some(o => same(o.ymd, ymd)))
      items.push({ title: `${ev.name} – ${OCC[ev.occasion] || ev.occasion}`, todo: OCC_TODO[ev.occasion] || [], mine: notesFor('fam:' + ev.id) });
  }
  for (const o of F.between(ymd, ymd, loc))
    items.push({ title: `${o.f.te} · ${o.f.en}`, todo: o.f.todo, mine: notesFor('fest:' + o.f.id), major: o.f.major });
  const mine = [...(info.adhika ? [] : notesFor(`year:${info.masa}:${info.tithi}`)), ...notesFor('month:' + info.tithi)];
  if (mine.length) items.push({ title: 'నా గుర్తులు · My notes', todo: [], mine });
  return { info, items };
}

function pushItems(lines, items) {
  for (const it of items) {
    lines.push('', `*${it.title}*`);
    for (const x of it.todo) lines.push(`• ${x}`);
    for (const x of it.mine) lines.push(`⭐ ${x}`);
  }
}

// Morning: today in full
function morningMessage(ymd) {
  const { info, items } = itemsOn(ymd);
  const sv = P.samvatsara(ymd, info.masa);
  const lines = [`🌅 ఈరోజు · Today`, `శ్రీ ${sv.te} నామ సంవత్సరం`, `${tithiLabel(info.masa, info.tithi, info.adhika)} · ${VAARAM[wd(ymd)]}`];
  if (!items.length) lines.push('', 'ఈరోజు ప్రత్యేకం లేదు · No festival today.');
  pushItems(lines, items);
  return lines.join('\n');
}

// Evening: tomorrow in full, so there is time to prepare; null when tomorrow is an ordinary day
function eveningMessage(ymd) {
  const tomorrow = P.addDays(ymd, 1);
  const { info, items } = itemsOn(tomorrow);
  if (!items.length) return null;
  const lines = [`🌙 రేపు · Tomorrow`, `${tithiLabel(info.masa, info.tithi, info.adhika)} · ${VAARAM[wd(tomorrow)]}`,
    'ఈరోజే సిద్ధం చేసుకోండి · Get ready today'];
  pushItems(lines, items);
  return lines.join('\n');
}

// Sunday: the coming week, Monday to Sunday, one line per special day
function weekMessage(ymd) {
  const lines = ['📅 ఈ వారం · This week'];
  let any = false;
  for (let i = 1; i <= 7; i++) {
    const d = P.addDays(ymd, i), { info, items } = itemsOn(d);
    lines.push('', `*${VAARAM[wd(d)]}* · ${tithiLabel(info.masa, info.tithi, info.adhika)}`);
    if (!items.length) { lines.push('  –'); continue; }
    any = true;
    for (const it of items) lines.push(`• ${it.title}${it.mine.length ? ` ⭐${it.mine.length}` : ''}`);
  }
  if (!any) lines.push('', 'No festivals this week.');
  return lines.join('\n');
}

function buildMessages(ymd) {
  if (mode === 'evening') return [eveningMessage(ymd)].filter(Boolean);
  const out = [morningMessage(ymd)];
  if (wd(ymd) === 0) out.push(weekMessage(ymd));
  return out;
}

function settings() {
  let w;
  try { w = JSON.parse(process.env.WHATSAPP || '{}'); } catch { throw new Error('WHATSAPP secret is not valid JSON. Check the quotes and brackets (see README).'); }
  for (const k of ['apiUrl', 'idInstance', 'apiTokenInstance'])
    if (!w[k]) throw new Error(`WHATSAPP secret is missing "${k}" (see README).`);
  return { ...w, apiUrl: String(w.apiUrl).replace(/\/+$/, '') };
}
const endpoint = (w, method) => `${w.apiUrl}/waInstance${w.idInstance}/${method}/${w.apiTokenInstance}`;

async function send(w, chatId, message) {
  const res = await fetch(endpoint(w, 'sendMessage'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId, message }),
  });
  const body = await res.text();
  if (!res.ok || !/idMessage/.test(body)) throw new Error(`Green API said ${res.status}: ${body.slice(0, 200)}`);
}

// Prints your WhatsApp groups so you can copy the group's chat ID into the WHATSAPP secret
// Looks in contacts, chats and the last day's messages, since a freshly linked phone may not list groups everywhere yet
async function listGroups(w) {
  const groups = new Map();
  for (const method of ['getContacts', 'getChats', 'lastIncomingMessages?minutes=1440', 'lastOutgoingMessages?minutes=1440']) {
    const [name, query] = method.split('?');
    try {
      const res = await fetch(endpoint(w, name) + (query ? '?' + query : ''));
      if (!res.ok) { console.log(`(${name}: ${res.status})`); continue; }
      const list = await res.json();
      for (const c of Array.isArray(list) ? list : []) {
        const id = String(c.id || c.chatId || '');
        if (!id.endsWith('@g.us')) continue;
        const label = c.name || c.chatName || c.contactName || '';
        if (!groups.has(id) || (label && !groups.get(id))) groups.set(id, label);
      }
    } catch (e) { console.log(`(${name}: ${e.message})`); }
  }
  if (!groups.size) console.log('No groups found. Send a message in the WhatsApp group from your phone, wait a minute, then try again.');
  for (const [id, label] of groups) console.log(`${label || '(name not shown)'}  →  ${id}`);
}

(async () => {
  if (mode === 'groups') return listGroups(settings());
  const ymd = todayIST();
  const messages = buildMessages(ymd);
  console.log(`=== ${mode} · ${ymd.join('-')} (${loc.name}) · ${messages.length} message(s) ===`);
  for (const m of messages) console.log(`${m}\n---`);
  if (dryRun || !messages.length) return;
  const w = settings();
  // Chats come from the secret, or else from data/chats.json (group IDs are not passwords)
  const chatsFile = path.join(__dirname, 'data', 'chats.json');
  const fileChats = fs.existsSync(chatsFile) ? JSON.parse(fs.readFileSync(chatsFile, 'utf8')) : [];
  const chats = (Array.isArray(w.chats) && w.chats.length ? w.chats : fileChats).filter(c => /@(g|c)\.us$/.test(c));
  if (!chats.length) throw new Error('No chat to send to. Add your group chat ID to data/chats.json (see README).');
  let failed = 0;
  for (const chatId of chats) for (const text of messages) {
    try { await send(w, chatId, text); console.log(`Sent to chat ${chatId.slice(-10)}`); }
    catch (e) { failed++; console.error(`Could not send to chat ${chatId.slice(-10)}: ${e.message}`); }
    await new Promise(res => setTimeout(res, 3000)); // a short gap between messages
  }
  if (failed) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
