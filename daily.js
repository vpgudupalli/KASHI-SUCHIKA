// Sends Telugu tithi, festivals and notes to WhatsApp via Green API (your own WhatsApp, linked by QR code).
// Usage: node daily.js                  tomorrow's full message (+ the coming week on Sundays) — the scheduled one, sent at 7 AM India time
//        node daily.js --mode=today     today's message (manual use only)
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
// tomorrow (= evening): the scheduled daily message about the next day; today (= morning): today's message
const modeArg = (args.find(a => a.startsWith('--mode=')) || '--mode=tomorrow').slice(7);
const mode = { tomorrow: 'evening', today: 'morning' }[modeArg] || modeArg;

// Family dates and notes: from the shared Google Sheet (data/sheet.json) when set up,
// otherwise from data/tithi-data.json (exported from the Tithi Reminders page)
const dataFile = path.join(__dirname, 'data', 'tithi-data.json');
const data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
let family = Array.isArray(data.family) ? data.family : [];
let notes = Array.isArray(data.notes) ? data.notes : [];
const loc = CITIES[data.city] || CITIES.hyd;

const sheetFile = path.join(__dirname, 'data', 'sheet.json');
const sheetId = fs.existsSync(sheetFile) ? JSON.parse(fs.readFileSync(sheetFile, 'utf8')).sheetId : null;
const SHEET_FESTS = [...F.LIST, ...F.RECURRING, { id: 'kartikasomavaram', te: 'కార్తీక సోమవారం', en: 'Kartika Somavaram' }];

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(s => s.trim()));
}
async function sheetTab(name) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok || /^\s*<!DOCTYPE|<html/i.test(body)) throw new Error(`could not read the "${name}" tab (${res.status}). Is the sheet shared as "Anyone with the link"?`);
  const rows = parseCsv(body);
  // Rows as {header: value}. Google returns the first tab when a name doesn't exist, so callers check headers.
  const head = rows[0] || [];
  return rows.slice(1).filter(r => r.some(Boolean)).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])))
    .map((o, i) => Object.assign(o, { _row: i + 2, _head: head }));
}
const hasHead = (rows, h) => rows.length && rows[0]._head.includes(h);
// Dropdown labels → numbers. Labels look like "Ashvayuja · ఆశ్వయుజము", "Shukla · శుక్ల", "10. Dashami · దశమి".
const first = s => String(s || '').split('·')[0].trim().toLowerCase();
const masaOf = s => P.MASAS.findIndex(m => m.toLowerCase() === first(s));
function tithiOf(paksha, tithi) {
  const n = parseInt(tithi, 10);
  if (!(n >= 1 && n <= 15)) return -1;
  return /^(bahula|krishna)/i.test(String(paksha).trim()) ? n + 15 : n;
}
const festOf = s => (SHEET_FESTS.find(f => f.en.toLowerCase() === first(s)) || {}).id;
// A date picked on the form's calendar → its Telugu masam and tithi (at sunrise). Accepts 2026-10-23,
// and 10/23/2026 or 23/10/2026 (read as day/month when the first number is over 12).
function teluguOfDate(s) {
  let y, m, d, x;
  if ((x = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) [y, m, d] = [+x[1], +x[2], +x[3]];
  else if ((x = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) [y, m, d] = +x[1] > 12 ? [+x[3], +x[2], +x[1]] : [+x[3], +x[1], +x[2]];
  else return null;
  if (!(y > 1800 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const info = P.dayInfo(y, m, d, loc); // in an adhika month, yearly repeats use the regular month of the same name
  return { masa: info.masa, tithi: info.tithi };
}

async function loadSheet() {
  const fam = [], nts = [], skipped = [];
  const addFam = (src, row, name, occ, masa, paksha, tithi, extra, date) => {
    let m = masaOf(masa), t = tithiOf(paksha, tithi);
    const fromDate = (m < 0 || t < 0) && date ? teluguOfDate(date) : null;
    if (fromDate) ({ masa: m, tithi: t } = fromDate);
    if (!name || m < 0 || t < 0) return skipped.push(`${src} row ${row}`);
    const id = `sheet-${src}-${row}`.replace(/\s+/g, '');
    fam.push({ id, name, occasion: first(occ) ? String(occ).split('·')[0].trim() : 'Other', masa: m, tithi: t });
    if (extra) nts.push({ id: id + '-x', target: 'fam:' + id, text: extra });
  };
  const addNote = (src, row, target, text) => {
    if (!text) return;
    if (!target) return skipped.push(`${src} row ${row}`);
    nts.push({ id: `sheet-${src}-${row}`.replace(/\s+/g, ''), target, text });
  };

  // Rows typed straight into the sheet
  const famRows = await sheetTab('Family');
  if (hasHead(famRows, 'Name') && hasHead(famRows, 'Occasion'))
    famRows.forEach(r => addFam('Family', r._row, r['Name'], r['Occasion'], r['Masam'], r['Paksham'], r['Tithi'], r['Extra things to do (optional)']));
  const noteRows = await sheetTab('Notes');
  if (hasHead(noteRows, 'Comes back on'))
    noteRows.forEach(r => {
      const k = first(r['Comes back on']), m = masaOf(r['Masam (if Telugu date)']), t = tithiOf(r['Paksham'], r['Tithi']), f = festOf(r['Festival (if festival)']);
      addNote('Notes', r._row, k.startsWith('festival') && f ? 'fest:' + f
        : k.startsWith('telugu date') && m >= 0 && t > 0 ? `year:${m}:${t}`
        : k.startsWith('tithi every month') && t > 0 ? 'month:' + t : null, r['What to do']);
    });

  // Entries saved by the Tithi Reminders Google app (tabs "App family" / "App notes": id, json, …)
  for (const [tab, kindName] of [['App family', 'family'], ['App notes', 'notes']]) {
    let rows = [];
    try { rows = await sheetTab(tab); } catch (e) { console.log(`(${tab}: ${e.message})`); }
    if (!hasHead(rows, 'json')) continue;
    for (const r of rows) {
      let d; try { d = JSON.parse(r['json']); } catch { skipped.push(`${tab} row ${r._row}`); continue; }
      const id = String(r['id'] || '');
      if (kindName === 'family') {
        if (d && typeof d.name === 'string' && Number.isInteger(d.masa) && d.masa >= 0 && d.masa < 12 && Number.isInteger(d.tithi) && d.tithi >= 1 && d.tithi <= 30)
          fam.push({ id, name: d.name, occasion: String(d.occasion || 'Other'), masa: d.masa, tithi: d.tithi });
        else skipped.push(`${tab} row ${r._row}`);
      } else if (d && typeof d.text === 'string' && /^(fest|fam|year|month):/.test(d.target || '')) nts.push({ id, target: d.target, text: d.text });
      else skipped.push(`${tab} row ${r._row}`);
    }
  }

  // Answers from the "Add a Tithi Reminder" Google Form
  let formRows = [];
  try { formRows = await sheetTab('Form entries'); } catch (e) { console.log(`(Form entries: ${e.message})`); }
  if (hasHead(formRows, 'What would you like to add?'))
    formRows.forEach(r => {
      const k = String(r['What would you like to add?']).toLowerCase(), row = r._row;
      if (k.includes('family')) return addFam('Form', row, r["Person's name"], r['Occasion'], r['Family · Masam'], r['Family · Paksham'], r['Family · Tithi'], r['Family · Extra things to do (optional)'], r['Family · Date it happened']);
      if (k.includes('festival')) { const f = festOf(r['Festival']); return addNote('Form', row, f && 'fest:' + f, r['Festival · What to do']); }
      if (k.includes('telugu date')) {
        let m = masaOf(r['Date · Masam']), t = tithiOf(r['Date · Paksham'], r['Date · Tithi']);
        const fromDate = (m < 0 || t < 0) && r['Date · Pick the day'] ? teluguOfDate(r['Date · Pick the day']) : null;
        if (fromDate) ({ masa: m, tithi: t } = fromDate);
        return addNote('Form', row, m >= 0 && t > 0 && `year:${m}:${t}`, r['Date · What to do']);
      }
      if (k.includes('every month')) { const t = tithiOf(r['Monthly · Paksham'], r['Monthly · Tithi']); return addNote('Form', row, t > 0 && 'month:' + t, r['Monthly · What to do']); }
      skipped.push(`Form row ${row}`);
    });

  if (skipped.length) console.log(`Skipped (missing masam/paksham/tithi/festival): ${skipped.join(', ')}`);
  return { fam, nts };
}

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

// Evening: tomorrow in full, every day, so there is time to prepare
function eveningMessage(ymd) {
  const tomorrow = P.addDays(ymd, 1);
  const { info, items } = itemsOn(tomorrow);
  const sv = P.samvatsara(tomorrow, info.masa);
  const lines = [`🗓️ రేపు · Tomorrow`, `శ్రీ ${sv.te} నామ సంవత్సరం`, `${tithiLabel(info.masa, info.tithi, info.adhika)} · ${VAARAM[wd(tomorrow)]}`];
  if (!items.length) lines.push('', 'రేపు ప్రత్యేకం లేదు · No festival tomorrow.');
  else lines.push('ఈరోజే సిద్ధం చేసుకోండి · Get ready today');
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
  if (mode === 'evening') return [eveningMessage(ymd), ...(wd(ymd) === 0 ? [weekMessage(ymd)] : [])]; // Sunday evening: + Mon–Sun
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
  try {
    const st = await (await fetch(endpoint(w, 'getStateInstance'))).json();
    console.log(`WhatsApp link status: ${st.stateInstance}${st.stateInstance === 'authorized' ? ' (linked OK)' : ' — open console.green-api.com and scan the QR code from WhatsApp → Linked devices'}`);
  } catch (e) { console.log(`(getStateInstance: ${e.message})`); }
  const groups = new Map();
  for (const method of ['getContacts', 'getChats', 'lastIncomingMessages?minutes=1440', 'lastOutgoingMessages?minutes=1440']) {
    const [name, query] = method.split('?');
    try {
      const res = await fetch(endpoint(w, name) + (query ? '?' + query : ''));
      if (!res.ok) { console.log(`(${name}: ${res.status})`); continue; }
      const list = await res.json();
      console.log(`${name}: ${Array.isArray(list) ? list.length + ' item(s)' : 'unexpected reply'}`);
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
  if (sheetId) {
    try {
      // The sheet plus anything already saved from the Tithi Reminders page, without repeats
      const s = await loadSheet();
      console.log(`Google Sheet: ${s.fam.length} family date(s), ${s.nts.length} note(s)`);
      const famKey = f => `${f.name}|${f.masa}|${f.tithi}`.toLowerCase(), noteKey = n => `${n.target}|${n.text}`.toLowerCase();
      const seenF = new Set(s.fam.map(famKey)), seenN = new Set(s.nts.map(noteKey));
      family = [...s.fam, ...family.filter(f => !seenF.has(famKey(f)))];
      notes = [...s.nts, ...notes.filter(n => !seenN.has(noteKey(n)))];
    }
    catch (e) { console.log(`WARNING: Google Sheet not read, using the saved data file instead: ${e.message}`); }
  }
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
  // Several scheduled tries run each morning/evening; skip any message already sent today (India date)
  const istDay = ms => new Date(ms + 5.5 * 3600000).toISOString().slice(0, 10);
  let recent = [];
  if (!args.includes('--force')) {
    try {
      const res = await fetch(endpoint(w, 'lastOutgoingMessages') + '?minutes=1440');
      if (res.ok) recent = await res.json();
    } catch (e) { console.log(`(could not check earlier messages: ${e.message})`); }
  }
  const today = istDay(Date.now());
  const sentToday = (chatId, text) => (Array.isArray(recent) ? recent : []).some(m =>
    m.chatId === chatId && m.sendByApi !== false && istDay((m.timestamp || 0) * 1000) === today &&
    String(m.textMessage || '').split('\n')[0] === text.split('\n')[0]);
  let failed = 0;
  for (const chatId of chats) for (const text of messages) {
    if (sentToday(chatId, text)) { console.log(`Already sent today to chat ${chatId.slice(-10)}: ${text.split('\n')[0]}`); continue; }
    try { await send(w, chatId, text); console.log(`Sent to chat ${chatId.slice(-10)}`); }
    catch (e) { failed++; console.error(`Could not send to chat ${chatId.slice(-10)}: ${e.message}`); }
    await new Promise(res => setTimeout(res, 3000)); // a short gap between messages
  }
  if (failed) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
