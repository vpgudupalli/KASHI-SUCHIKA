// Generates setup-form.gs: a Google Apps Script that builds the "Add a Tithi Reminder" Google Form
// inside the Tithi Family Notebook sheet. Run: node make_form_script.js
const fs = require('fs');
global.Panchang = require('./engine.js');
const F = require('./festivals.js');
const P = Panchang;

const masas = P.MASAS.map((m, i) => `${m} · ${P.MASAS_TE[i]}`);
const tithis = [];
for (let i = 1; i <= 14; i++) { const t = P.tithiName(i); tithis.push(`${i}. ${t.en} · ${t.te}`); }
tithis.push('15. Pournami / Amavasya · పౌర్ణమి / అమావాస్య');
const fests = [...F.LIST, ...F.RECURRING, { en: 'Kartika Somavaram', te: 'కార్తీక సోమవారం' }].map(f => `${f.en} · ${f.te}`);

const script = `// Tithi Reminders: builds the "Add a Tithi Reminder" form for this sheet.
// How to use: in this Google Sheet, Extensions → Apps Script, paste this whole file, click Save, then Run.
// The form's answers land in the "Form entries" tab, which the daily WhatsApp job reads.

const MASAS = ${JSON.stringify(masas)};
const PAKSHAS = ['Shukla · శుక్ల', 'Bahula (Krishna) · బహుళ'];
const TITHIS = ${JSON.stringify(tithis)};
const FESTIVALS = ${JSON.stringify(fests)};
const OCCASIONS = ['Birthday · పుట్టినరోజు', 'Wedding anniversary · పెళ్లిరోజు', 'Aabdikam · ఆబ్దికం', 'Other · ఇతర'];

function createReminderForm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const form = FormApp.create('Add a Tithi Reminder · తిథి గుర్తు');
  form.setDescription('Add a family date or your own note. It is sent to the family WhatsApp group on the right Telugu date, every year.')
    .setAllowResponseEdits(true)
    .setConfirmationMessage('Saved! It will come in the WhatsApp reminders on that day, every year. 🙏');

  const kind = form.addMultipleChoiceItem().setTitle('What would you like to add?').setRequired(true);
  form.addTextItem().setTitle('Your name (optional)');

  const famPage = form.addPageBreakItem().setTitle('Family birthday / anniversary / aabdikam');
  form.addTextItem().setTitle("Person's name").setRequired(true);
  form.addListItem().setTitle('Occasion').setChoiceValues(OCCASIONS).setRequired(true);
  form.addDateItem().setTitle('Family · Date it happened')
    .setHelpText('Pick the birth / wedding / passing date on the calendar. The Telugu tithi is worked out for you, and the reminder comes every year on that tithi. If you already know the tithi instead, leave this empty and choose below.');
  form.addListItem().setTitle('Family · Masam').setChoiceValues(MASAS).setHelpText('Only if you did not pick a date above.');
  form.addListItem().setTitle('Family · Paksham').setChoiceValues(PAKSHAS).setHelpText('Only if you did not pick a date above.');
  form.addListItem().setTitle('Family · Tithi').setChoiceValues(TITHIS)
    .setHelpText('Only if you did not pick a date above. 15 means Pournami in Shukla paksham and Amavasya in Bahula paksham.');
  form.addParagraphTextItem().setTitle('Family · Extra things to do (optional)');

  const festPage = form.addPageBreakItem().setTitle('Note for a festival').setGoToPage(FormApp.PageNavigationType.SUBMIT);
  form.addListItem().setTitle('Festival').setChoiceValues(FESTIVALS).setRequired(true);
  form.addParagraphTextItem().setTitle('Festival · What to do').setRequired(true);

  const datePage = form.addPageBreakItem().setTitle('Note for a Telugu date (every year)').setGoToPage(FormApp.PageNavigationType.SUBMIT);
  form.addDateItem().setTitle('Date · Pick the day')
    .setHelpText('Pick any day on the calendar. The note comes back every year on the Telugu tithi of that day. Or leave empty and choose masam, paksham and tithi below.');
  form.addListItem().setTitle('Date · Masam').setChoiceValues(MASAS).setHelpText('Only if you did not pick a day above.');
  form.addListItem().setTitle('Date · Paksham').setChoiceValues(PAKSHAS).setHelpText('Only if you did not pick a day above.');
  form.addListItem().setTitle('Date · Tithi').setChoiceValues(TITHIS).setHelpText('Only if you did not pick a day above.');
  form.addParagraphTextItem().setTitle('Date · What to do').setRequired(true);

  const monthPage = form.addPageBreakItem().setTitle('Note for a tithi (every month)').setGoToPage(FormApp.PageNavigationType.SUBMIT);
  form.addListItem().setTitle('Monthly · Paksham').setChoiceValues(PAKSHAS).setRequired(true);
  form.addListItem().setTitle('Monthly · Tithi').setChoiceValues(TITHIS).setRequired(true);
  form.addParagraphTextItem().setTitle('Monthly · What to do').setRequired(true);

  kind.setChoices([
    kind.createChoice('A family birthday / anniversary / aabdikam', famPage),
    kind.createChoice('A note for a festival', festPage),
    kind.createChoice('A note for a Telugu date (every year)', datePage),
    kind.createChoice('A note for a tithi (every month)', monthPage),
  ]);

  // Send answers into this spreadsheet, in a tab called "Form entries"
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  const formUrl = form.getEditUrl().replace(/\\/edit.*$/, '');
  const tab = ss.getSheets().find(s => { const u = s.getFormUrl(); return u && u.replace(/\\/(edit|viewform).*$/, '') === formUrl; });
  if (tab) {
    tab.setName('Form entries');
    // Show picked dates as 2026-10-23 so the WhatsApp job reads them the same way in every country
    const head = tab.getRange(1, 1, 1, tab.getLastColumn()).getValues()[0];
    head.forEach((h, i) => { if (/Date it happened|Pick the day/.test(h)) tab.getRange(1, i + 1, tab.getMaxRows()).offset(1, 0, tab.getMaxRows() - 1).setNumberFormat('yyyy-mm-dd'); });
  }

  // A "Start here" tab with the link to share
  const start = ss.getSheetByName('Start here') || ss.insertSheet('Start here', 0);
  start.clear();
  start.getRange('A1').setValue('Add reminders with this form (share it with family, or pin it in the WhatsApp group):');
  start.getRange('A2').setValue(form.getPublishedUrl());
  start.getRange('A4').setValue('To change or remove an entry, edit or delete its row in the "Form entries" tab.');
  start.setColumnWidth(1, 700);
  Logger.log('Form link: ' + form.getPublishedUrl());
}
`;
fs.writeFileSync('setup-form.gs', script);
console.log('wrote setup-form.gs', script.length, 'chars');
