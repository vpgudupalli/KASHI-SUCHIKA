// Builds app/Code.gs: the Tithi Reminders page as a Google Apps Script web app that saves
// family dates and notes into the Tithi Family Notebook sheet (tabs "App family" / "App notes").
// Source page: tithi-reminders-page.html (the published Claude page, with engine + festivals inlined).
// Run: node build-app.js
const fs = require('fs');
const SHEET_ID = JSON.parse(fs.readFileSync('data/sheet.json', 'utf8')).sheetId;
let h = fs.readFileSync('tithi-reminders-page.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('not found: ' + a.slice(0, 70)); h = h.replace(a, () => b); };

rep('<meta name="claude:viewport-fit-sides" content="cover">\n', '');

// Storage: the page talks to a small "db" that reads and writes the sheet through Apps Script
rep('<script>\n(() => {\nconst P = Panchang, F = Festivals;', `<script>
// Saves to the Google Sheet through Apps Script; refreshes every 20 s and when the page comes back into view
const GASDB = (() => {
  const call = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res)
    .withFailureHandler(e => rej({ code: 'unavailable', message: (e && e.message) || String(e) }))[fn](...a));
  const subs = {};
  async function refresh(coll) {
    const list = subs[coll]; if (!list) return;
    try {
      const rows = await call('listDocs', coll);
      const snap = { docs: rows.map(r => ({ id: r.id, exists: true, data: () => r.data })) };
      list.forEach(([next]) => next(snap));
    } catch (e) { list.forEach(([, err]) => err && err(e)); }
  }
  setInterval(() => Object.keys(subs).forEach(refresh), 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) Object.keys(subs).forEach(refresh); });
  return { collection: coll => ({
    onSnapshot(next, err) { (subs[coll] = subs[coll] || []).push([next, err]); refresh(coll); return () => {}; },
    doc: id => ({
      set: async body => { await call('setDoc', coll, id, body, false); refresh(coll); },
      update: async body => { await call('setDoc', coll, id, body, true); refresh(coll); },
      delete: async () => { await call('deleteDoc', coll, id); refresh(coll); },
    }),
  }) };
})();
window.claude = { use: async name => (name === 'db' ? GASDB : null) };
</script>
<script>
(() => {
const P = Panchang, F = Festivals;`);

// Pop-up calendar: pick a date, the Telugu date fills in
rep('      <div class="preview" id="preview" aria-live="polite"></div>',
  `      <div class="field"><label for="fDate">📅 Or pick the date on the calendar (birth / wedding / passing)</label><input id="fDate" type="date" min="1900-01-01" max="2100-12-31"></div>
      <div class="preview" id="preview" aria-live="polite"></div>`);
rep('        <div class="field" id="nFestF"><label for="nFest">Festival</label><select id="nFest"></select></div>',
  `        <div class="field" id="nFestF"><label for="nFest">Festival</label><select id="nFest"></select></div>
        <div class="field" id="nDateF" hidden><label for="nDate">📅 Pick the day on the calendar</label><input id="nDate" type="date" min="1900-01-01" max="2100-12-31"></div>`);
rep("  $('nFestF').hidden = k !== 'fest'; $('nMasaF').hidden = k !== 'year';",
  "  $('nFestF').hidden = k !== 'fest'; $('nMasaF').hidden = k !== 'year'; $('nDateF').hidden = k !== 'year';");
rep('computeFest();\nrenderAll();', `function teluguOf(v) { const [y, m, d] = v.split('-').map(Number); return P.dayInfo(y, m, d, loc()); }
$('fDate').addEventListener('change', () => {
  if (!$('fDate').value) return;
  const i = teluguOf($('fDate').value);
  $('fMasa').value = String(i.masa); $('fPaksha').value = i.tithi > 15 ? 'K' : 'S'; fillTithis(); $('fTithi').value = String(i.tithi);
  updatePreview(); toast('Telugu date: ' + tithiLabel(i.masa, i.tithi, false).te);
});
$('nDate').addEventListener('change', () => {
  if (!$('nDate').value) return;
  const i = teluguOf($('nDate').value);
  $('nMasa').value = String(i.masa); $('nPaksha').value = i.tithi > 15 ? 'K' : 'S'; fillNoteTithis(); $('nTithi').value = String(i.tithi);
  toast('Telugu date: ' + tithiLabel(i.masa, i.tithi, false).te + ' (every year)');
});

computeFest();
renderAll();`);

// File downloads are a Claude-page feature; WhatsApp reminders come from the sheet instead
rep('id="csvBtn">', 'id="csvBtn" hidden>');
rep('id="jsonBtn">', 'id="jsonBtn" hidden>');
rep("Open this page while signed in to Claude, then anything you added here can be copied to the shared page.",
  "Check your internet connection and reload the page.");
rep("Saved with this page, so family you share it with see the same list.",
  "Saved in the shared Tithi Family Notebook, so your family sees the same list, and it goes to WhatsApp.");

const code = `// Tithi Reminders web app. Built by build-app.js from the Tithi Reminders page; edit there, not here.
// Saves family dates and notes in the Tithi Family Notebook sheet; the daily WhatsApp job reads them.
const SHEET_ID = '${SHEET_ID}';
const TABS = { events: 'App family', notes: 'App notes' };

function doGet() {
  return HtmlService.createHtmlOutput(APP_HTML)
    .setTitle('Tithi Reminders · తిథి గుర్తులు')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function tab_(coll) {
  if (!TABS[coll]) throw new Error('Unknown list');
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(TABS[coll]);
  if (!sh) { sh = ss.insertSheet(TABS[coll]); sh.appendRow(['id', 'json', 'updated', 'summary']); sh.setFrozenRows(1); }
  return sh;
}
function rowOf_(sh, id) {
  if (sh.getLastRow() < 2) return 0;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
  const i = ids.indexOf(String(id));
  return i < 0 ? 0 : i + 2;
}
function summary_(coll, b) { return coll === 'events' ? (b.name || '') + ' – ' + (b.occasion || '') : (b.text || ''); }

function listDocs(coll) {
  const sh = tab_(coll);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().reduce((out, r) => {
    if (r[0]) { try { out.push({ id: String(r[0]), data: JSON.parse(r[1]) }); } catch (e) {} }
    return out;
  }, []);
}
function setDoc(coll, id, data, merge) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(id))) throw new Error('Bad id');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = tab_(coll), row = rowOf_(sh, id);
    let body = data;
    if (row && merge) { try { body = Object.assign(JSON.parse(sh.getRange(row, 2).getValue() || '{}'), data); } catch (e) {} }
    const vals = [String(id), JSON.stringify(body), new Date(), summary_(coll, body)];
    if (row) sh.getRange(row, 1, 1, 4).setValues([vals]); else sh.appendRow(vals);
  } finally { lock.releaseLock(); }
}
function deleteDoc(coll, id) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { const sh = tab_(coll), row = rowOf_(sh, id); if (row) sh.deleteRow(row); } finally { lock.releaseLock(); }
}

const APP_HTML = ${JSON.stringify(h)};
`;
fs.mkdirSync('app', { recursive: true });
fs.writeFileSync('app/Code.gs', code);
console.log('wrote app/Code.gs', code.length, 'chars');
