// Tithi Reminders: builds the "Add a Tithi Reminder" form for this sheet.
// How to use: in this Google Sheet, Extensions → Apps Script, paste this whole file, click Save, then Run.
// The form's answers land in the "Form entries" tab, which the daily WhatsApp job reads.

const MASAS = ["Chaitra · చైత్రము","Vaishakha · వైశాఖము","Jyeshtha · జ్యేష్ఠము","Ashadha · ఆషాఢము","Shravana · శ్రావణము","Bhadrapada · భాద్రపదము","Ashvayuja · ఆశ్వయుజము","Kartika · కార్తీకము","Margashira · మార్గశిరము","Pushya · పుష్యము","Magha · మాఘము","Phalguna · ఫాల్గుణము"];
const PAKSHAS = ['Shukla · శుక్ల', 'Bahula (Krishna) · బహుళ'];
const TITHIS = ["1. Pratipada · పాడ్యమి","2. Vidiya · విదియ","3. Tadiya · తదియ","4. Chavithi · చవితి","5. Panchami · పంచమి","6. Shashthi · షష్ఠి","7. Saptami · సప్తమి","8. Ashtami · అష్టమి","9. Navami · నవమి","10. Dashami · దశమి","11. Ekadashi · ఏకాదశి","12. Dvadashi · ద్వాదశి","13. Trayodashi · త్రయోదశి","14. Chaturdashi · చతుర్దశి","15. Pournami / Amavasya · పౌర్ణమి / అమావాస్య"];
const FESTIVALS = ["Ugadi (Telugu New Year) · ఉగాది","Sri Rama Navami · శ్రీరామ నవమి","Akshaya Tritiya · అక్షయ తృతీయ","Hanuman Jayanti · హనుమజ్జయంతి","Tholi Ekadashi · తొలి ఏకాదశి","Guru Pournami · గురు పౌర్ణమి","Naga Panchami · నాగ పంచమి","Varalakshmi Vratam · వరలక్ష్మీ వ్రతం","Raksha Bandhan · Jandhyala Pournami · రాఖీ పౌర్ణమి · జంధ్యాల పౌర్ణమి","Sri Krishna Janmashtami · శ్రీకృష్ణాష్టమి","Vinayaka Chavithi · వినాయక చవితి","Mahalaya Amavasya · Engili Pula Bathukamma · మహాలయ అమావాస్య · ఎంగిలి పూల బతుకమ్మ","Durgashtami · Saddula Bathukamma · దుర్గాష్టమి · సద్దుల బతుకమ్మ","Maha Navami · మహార్నవమి","Vijayadashami (Dasara) · విజయదశమి (దసరా)","Atla Taddi · అట్లతద్ది","Naraka Chaturdashi · నరక చతుర్దశి","Deepavali · దీపావళి","Nagula Chavithi · నాగుల చవితి","Kartika Pournami · కార్తీక పౌర్ణమి","Subrahmanya Shashthi · సుబ్రహ్మణ్య షష్ఠి","Datta Jayanti · దత్త జయంతి","Mukkoti (Vaikuntha) Ekadashi · ముక్కోటి ఏకాదశి","Bhogi · భోగి","Makara Sankranti · మకర సంక్రాంతి","Kanuma · కనుమ","Vasantha Panchami · వసంత పంచమి","Ratha Saptami · రథ సప్తమి","Maha Shivaratri · మహా శివరాత్రి","Holi · Kamuni Pournami · హోళీ · కాముని పౌర్ణమి","Ekadashi · ఏకాదశి","Pournami (full moon) · పౌర్ణమి","Amavasya (new moon) · అమావాస్య","Sankashti Chaturthi · సంకష్టహర చతుర్థి","Pradosham · ప్రదోషం","Masa Shivaratri · మాస శివరాత్రి","Kartika Somavaram · కార్తీక సోమవారం"];
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
  form.addListItem().setTitle('Family · Masam').setChoiceValues(MASAS).setRequired(true);
  form.addListItem().setTitle('Family · Paksham').setChoiceValues(PAKSHAS).setRequired(true);
  form.addListItem().setTitle('Family · Tithi').setChoiceValues(TITHIS).setRequired(true)
    .setHelpText('15 means Pournami in Shukla paksham and Amavasya in Bahula paksham.');
  form.addParagraphTextItem().setTitle('Family · Extra things to do (optional)');

  const festPage = form.addPageBreakItem().setTitle('Note for a festival').setGoToPage(FormApp.PageNavigationType.SUBMIT);
  form.addListItem().setTitle('Festival').setChoiceValues(FESTIVALS).setRequired(true);
  form.addParagraphTextItem().setTitle('Festival · What to do').setRequired(true);

  const datePage = form.addPageBreakItem().setTitle('Note for a Telugu date (every year)').setGoToPage(FormApp.PageNavigationType.SUBMIT);
  form.addListItem().setTitle('Date · Masam').setChoiceValues(MASAS).setRequired(true);
  form.addListItem().setTitle('Date · Paksham').setChoiceValues(PAKSHAS).setRequired(true);
  form.addListItem().setTitle('Date · Tithi').setChoiceValues(TITHIS).setRequired(true);
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
  const formUrl = form.getEditUrl().replace(/\/edit.*$/, '');
  const tab = ss.getSheets().find(s => { const u = s.getFormUrl(); return u && u.replace(/\/(edit|viewform).*$/, '') === formUrl; });
  if (tab) tab.setName('Form entries');

  // A "Start here" tab with the link to share
  const start = ss.getSheetByName('Start here') || ss.insertSheet('Start here', 0);
  start.clear();
  start.getRange('A1').setValue('Add reminders with this form (share it with family, or pin it in the WhatsApp group):');
  start.getRange('A2').setValue(form.getPublishedUrl());
  start.getRange('A4').setValue('To change or remove an entry, edit or delete its row in the "Form entries" tab.');
  start.setColumnWidth(1, 700);
  Logger.log('Form link: ' + form.getPublishedUrl());
}
