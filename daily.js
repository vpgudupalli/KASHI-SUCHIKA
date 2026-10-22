// Sends today's Telugu tithi, festivals and notes to WhatsApp via CallMeBot.
// Usage: node daily.js            send for today (India time)
//        node daily.js --dry-run  print the message, send nothing
//        node daily.js --date=2026-11-08 --dry-run   try another day
// Recipients come from the RECIPIENTS secret: [{"name":"Me","phone":"+91...","apikey":"..."}]
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

function buildMessage(ymd) {
  const { info, items } = itemsOn(ymd);
  const sv = P.samvatsara(ymd, info.masa);
  const lines = [`🌅 శ్రీ ${sv.te} నామ సంవత్సరం`, `${tithiLabel(info.masa, info.tithi, info.adhika)} · ${VAARAM[wd(ymd)]}`];
  if (!items.length) lines.push('', 'ఈరోజు ప్రత్యేకం లేదు · No festival today.');
  for (const it of items) {
    lines.push('', `*${it.title}*`);
    for (const x of it.todo) lines.push(`• ${x}`);
    for (const x of it.mine) lines.push(`⭐ ${x}`);
  }
  const tomorrow = P.addDays(ymd, 1);
  const next = F.between(tomorrow, tomorrow, loc).filter(o => o.f.major);
  if (next.length) lines.push('', `రేపు · Tomorrow: ${next.map(o => o.f.te).join(', ')}`);
  return lines.join('\n');
}

async function send(r, text) {
  const url = 'https://api.callmebot.com/whatsapp.php?' + new URLSearchParams({ phone: r.phone, text, apikey: r.apikey });
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok || /error|invalid|not\s+allowed/i.test(body) && !/queued|sent/i.test(body))
    throw new Error(`CallMeBot said ${res.status}: ${body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}`);
}

(async () => {
  const ymd = todayIST();
  const text = buildMessage(ymd);
  console.log(`--- ${ymd.join('-')} (${loc.name}) ---\n${text}\n`);
  if (dryRun) return;
  let recipients;
  try { recipients = JSON.parse(process.env.RECIPIENTS || '[]'); } catch { throw new Error('RECIPIENTS secret is not valid JSON.'); }
  if (!recipients.length) throw new Error('No recipients. Add the RECIPIENTS secret in GitHub (see README).');
  let failed = 0;
  for (const r of recipients) {
    try { await send(r, text); console.log(`Sent to ${r.name || 'recipient'}`); }
    catch (e) { failed++; console.error(`Could not send to ${r.name || 'recipient'}: ${e.message}`); }
    await new Promise(res => setTimeout(res, 3000)); // CallMeBot asks for a gap between messages
  }
  if (failed) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
