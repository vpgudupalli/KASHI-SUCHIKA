// Telugu festivals and monthly special days, with what to do on each
const Festivals = ((P) => {
  // Hours after sunrise at which a festival's tithi must be running (traditional kala rules)
  const MID = 6, APA = 8.5, PRA = 13, NIS = 18, ARU = -1.5;
  // masa index: 0 Chaitra … 11 Phalguna; tithi 1–15 Shukla, 16–30 Krishna (30 = Amavasya)
  const LIST = [
    { id: 'ugadi', te: 'ఉగాది', en: 'Ugadi (Telugu New Year)', masa: 0, tithi: 1, major: true,
      todo: ['Oil bath (abhyanga snanam) early in the morning', 'Mango-leaf toranam on the door and muggulu in front of the house',
        'Make Ugadi pachadi with the six tastes: neem flower, jaggery, tamarind, raw mango, salt and chilli',
        'Listen to Panchanga Shravanam for the new year', 'New clothes and a temple visit'] },
    { id: 'ramanavami', te: 'శ్రీరామ నవమి', en: 'Sri Rama Navami', masa: 0, tithi: 9, major: true, kala: MID,
      todo: ['Sita Rama Kalyanam puja at home or at the temple', 'Offer panakam and vadapappu as prasadam', 'Read or listen to the Ramayana'] },
    { id: 'akshaya', te: 'అక్షయ తృతీయ', en: 'Akshaya Tritiya', masa: 1, tithi: 3,
      todo: ['Lakshmi puja', 'Give water, buttermilk or food in charity (danam)', 'A good day to buy gold or start something new'] },
    { id: 'hanuman', te: 'హనుమజ్జయంతి', en: 'Hanuman Jayanti', masa: 1, tithi: 25, major: true,
      todo: ['Recite Hanuman Chalisa or Sundarakanda', 'Visit a Hanuman temple', 'Offer a tamalapaku (betel leaf) garland'] },
    { id: 'tholiekadashi', te: 'తొలి ఏకాదశి', en: 'Tholi Ekadashi', masa: 3, tithi: 11, major: true,
      todo: ['Fast (upavasam) and do Vishnu puja', 'Offer pelala pindi (roasted flour with jaggery) as prasadam', 'Chaturmasya begins today'] },
    { id: 'gurupournami', te: 'గురు పౌర్ణమి', en: 'Guru Pournami', masa: 3, tithi: 15,
      todo: ['Honour your guru and teachers', 'Vyasa puja', 'Visit a Sai Baba or Dattatreya temple'] },
    { id: 'nagapanchami', te: 'నాగ పంచమి', en: 'Naga Panchami', masa: 4, tithi: 5,
      todo: ['Offer milk at a snake anthill (putta)', 'Naga devata puja'] },
    { id: 'varalakshmi', te: 'వరలక్ష్మీ వ్రతం', en: 'Varalakshmi Vratam', special: 'varalakshmi', major: true,
      todo: ['Women do Varalakshmi puja with a decorated kalasham', 'Tie the sacred thoram on the wrist',
        'Invite women home for thamboolam (betel leaves, turmeric, kumkum)'] },
    { id: 'rakhi', te: 'రాఖీ పౌర్ణమి · జంధ్యాల పౌర్ణమి', en: 'Raksha Bandhan · Jandhyala Pournami', masa: 4, tithi: 15, major: true,
      todo: ['Sisters tie rakhi to brothers', 'Men who wear the sacred thread change their jandhyam'] },
    { id: 'krishnashtami', te: 'శ్రీకృష్ణాష్టమి', en: 'Sri Krishna Janmashtami', masa: 4, tithi: 23, major: true, kala: NIS,
      todo: ['Fast until midnight, when Krishna was born', 'Draw little feet from the door to the puja room',
        'Offer butter, atukulu (poha) and milk sweets', 'Utti kottadam (breaking the pot) with the children'] },
    { id: 'vinayaka', te: 'వినాయక చవితి', en: 'Vinayaka Chavithi', masa: 5, tithi: 4, major: true, kala: MID,
      todo: ['Bring home a clay Ganesha', 'Patri puja with 21 kinds of leaves', 'Offer undrallu and kudumulu',
        'Read the Vinayaka Chavithi katha and put the akshintalu on your head', 'Avoid looking at the moon tonight'] },
    { id: 'mahalaya', te: 'మహాలయ అమావాస్య · ఎంగిలి పూల బతుకమ్మ', en: 'Mahalaya Amavasya · Engili Pula Bathukamma', masa: 5, tithi: 30, major: true,
      todo: ['Tarpanam for ancestors (end of Pitru Paksham)', 'Bathukamma begins: arrange flowers in tiers',
        'Women sing and dance around the Bathukamma in the evening'] },
    { id: 'durgashtami', te: 'దుర్గాష్టమి · సద్దుల బతుకమ్మ', en: 'Durgashtami · Saddula Bathukamma', masa: 6, tithi: 8, major: true,
      todo: ['Durga puja', 'Saddula Bathukamma: the biggest Bathukamma, then immersion in water', 'Share saddulu (flavoured rice dishes)'] },
    { id: 'mahanavami', te: 'మహార్నవమి', en: 'Maha Navami', masa: 6, tithi: 9,
      todo: ['Ayudha puja: worship tools, vehicles and books', 'Durga or Saraswati puja'] },
    { id: 'dasara', te: 'విజయదశమి (దసరా)', en: 'Vijayadashami (Dasara)', masa: 6, tithi: 10, major: true, kala: APA,
      todo: ['Jammi (Shami) puja and give jammi leaves to elders for blessings', 'Try to see a palapitta (Indian roller) bird',
        'A good day to start learning (aksharabhyasam)', 'Ravana dahanam in the evening'] },
    { id: 'atlataddi', te: 'అట్లతద్ది', en: 'Atla Taddi', masa: 6, tithi: 18,
      todo: ['Women and girls eat before dawn, then fast', 'Make attlu (dosas) and offer them to Gauri', 'Swings and games with friends'] },
    { id: 'narakachaturdashi', te: 'నరక చతుర్దశి', en: 'Naraka Chaturdashi', masa: 6, tithi: 29, major: true, kala: ARU,
      todo: ['Oil bath before sunrise', 'Light diyas in the evening', 'Crackers with the family'] },
    { id: 'deepavali', te: 'దీపావళి', en: 'Deepavali', masa: 6, tithi: 30, major: true, kala: PRA,
      todo: ['Lakshmi puja in the evening', 'Light diyas around the house', 'Share sweets with neighbours'] },
    { id: 'nagulachavithi', te: 'నాగుల చవితి', en: 'Nagula Chavithi', masa: 7, tithi: 4, major: true,
      todo: ['Fast and offer milk at a snake anthill (putta)', 'Offer chalimidi and nuvvula undalu (sesame balls)'] },
    { id: 'kartikapournami', te: 'కార్తీక పౌర్ణమి', en: 'Kartika Pournami', masa: 7, tithi: 15, major: true,
      todo: ['Light 365 wicks (deepam) at home or in a temple', 'Shiva puja', 'Float diyas in a river or pond (deepa danam)'] },
    { id: 'subrahmanya', te: 'సుబ్రహ్మణ్య షష్ఠి', en: 'Subrahmanya Shashthi', masa: 8, tithi: 6,
      todo: ['Subrahmanya Swamy puja and fasting', 'Visit a Subrahmanya temple'] },
    { id: 'datta', te: 'దత్త జయంతి', en: 'Datta Jayanti', masa: 8, tithi: 15,
      todo: ['Dattatreya puja', 'Read the Guru Charitra'] },
    { id: 'mukkoti', te: 'ముక్కోటి ఏకాదశి', en: 'Mukkoti (Vaikuntha) Ekadashi', special: 'mukkoti', major: true,
      todo: ['Uttara dwara darshanam (enter a Vishnu temple through the north gate)', 'Fast through the day', 'Stay up at night (jagaranam)'] },
    { id: 'bhogi', te: 'భోగి', en: 'Bhogi', special: 'sankranti', offset: -1, major: true,
      todo: ['Bhogi mantalu: a bonfire at dawn with old things', 'Bhogi pallu: shower regi pallu over the children in the evening',
        'Big muggulu in front of the house'] },
    { id: 'sankranti', te: 'మకర సంక్రాంతి', en: 'Makara Sankranti', special: 'sankranti', offset: 0, major: true,
      todo: ['Muggulu with gobbemmalu (cow-dung balls with flowers)', 'Make pongali, ariselu and other pindi vantalu',
        'Offerings for ancestors', 'Kite flying', 'Welcome the Haridasu and the Gangireddulu'] },
    { id: 'kanuma', te: 'కనుమ', en: 'Kanuma', special: 'sankranti', offset: 1, major: true,
      todo: ['Bathe and decorate the cattle, then do their puja', 'Family feast', 'Elders say not to travel today'] },
    { id: 'vasantapanchami', te: 'వసంత పంచమి', en: 'Vasantha Panchami', masa: 10, tithi: 5,
      todo: ['Saraswati puja', 'Aksharabhyasam for small children'] },
    { id: 'rathasaptami', te: 'రథ సప్తమి', en: 'Ratha Saptami', masa: 10, tithi: 7, major: true,
      todo: ['Bathe with seven jilledu (calotropis) leaves on the head', 'Surya puja at sunrise', 'Cook paramannam for Surya'] },
    { id: 'shivaratri', te: 'మహా శివరాత్రి', en: 'Maha Shivaratri', masa: 10, tithi: 29, major: true, kala: NIS,
      todo: ['Fast through the day', 'Abhishekam to Shiva with milk and water', 'Stay awake through the night (jagaranam)', 'Visit a Shiva temple'] },
    { id: 'holi', te: 'హోళీ · కాముని పౌర్ణమి', en: 'Holi · Kamuni Pournami', masa: 11, tithi: 15, major: true, kala: PRA,
      todo: ['Kama dahanam bonfire tonight', 'Colours are played the next morning', 'Sweets with friends and family'] },
  ];

  // Monthly special days (any month)
  const RECURRING = [
    { id: 'ekadashi', te: 'ఏకాదశి', en: 'Ekadashi', tithis: [11, 26],
      todo: ['Fast or eat light food; skip rice', 'Vishnu puja or Vishnu Sahasranamam'] },
    { id: 'pournami', te: 'పౌర్ణమి', en: 'Pournami (full moon)', tithis: [15],
      todo: ['Satyanarayana Swamy vratam if your family does it', 'Light a lamp in the evening', 'Temple visit'] },
    { id: 'amavasya', te: 'అమావాస్య', en: 'Amavasya (new moon)', tithis: [30],
      todo: ['Tarpanam for ancestors', 'Light a lamp in the evening', 'Elders avoid starting new work today'] },
    { id: 'sankashti', te: 'సంకష్టహర చతుర్థి', en: 'Sankashti Chaturthi', tithis: [19],
      todo: ['Ganesha puja', 'Fast until moonrise, then eat after seeing the moon'] },
    { id: 'pradosham', te: 'ప్రదోషం', en: 'Pradosham', tithis: [13, 28],
      todo: ['Shiva puja at dusk (pradosha kalam)', 'Temple visit in the evening'] },
    { id: 'masashivaratri', te: 'మాస శివరాత్రి', en: 'Masa Shivaratri', tithis: [29],
      todo: ['Shiva abhishekam', 'Fast through the day if you can'] },
  ];
  const KARTIKA_MONDAY = { id: 'kartikasomavaram', te: 'కార్తీక సోమవారం', en: 'Kartika Somavaram',
    todo: ['Fast until evening', 'Shiva abhishekam and a lamp at dusk'] };

  const key = ymd => ymd.join('-');
  const weekday = ([y, m, d]) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  // All festivals and special days with fromYMD <= day <= toYMD, sorted
  function between(fromYMD, toYMD, loc) {
    const a = P.jdOfYMD(fromYMD), b = P.jdOfYMD(toYMD) + 1;
    const out = [], seen = new Set();
    const push = (f, o, masa) => {
      const j = P.jdOfYMD(o.ymd); if (j < a || j >= b) return;
      if (seen.has(f.id + key(o.ymd))) return; seen.add(f.id + key(o.ymd));
      out.push({ f, ymd: o.ymd, kshaya: !!o.kshaya, masa });
    };
    const months = P.lunarMonths(a - 32, b + 32);
    for (const mi of months) {
      for (const r of RECURRING) for (const t of r.tithis) {
        if (r.id === 'masashivaratri' && mi.masa === 10 && !mi.adhika) continue; // Maha Shivaratri that month
        push(r, P.tithiDay(mi.start, t, loc), mi.masa);
      }
      if (mi.adhika) continue;
      for (const f of LIST) if (f.masa === mi.masa) push(f, P.tithiDay(mi.start, f.tithi, loc, f.kala || 0), mi.masa);
      if (mi.masa === 4) { // Varalakshmi: the Friday on or before Shravana Pournami
        const pn = P.tithiDay(mi.start, 15, loc).ymd;
        push(LIST.find(f => f.id === 'varalakshmi'), { ymd: P.addDays(pn, -((weekday(pn) - 5 + 7) % 7)) }, 4);
      }
      if (mi.masa === 8 || mi.masa === 9) { // Mukkoti: Shukla Ekadashi while the sun is in Dhanu
        const o = P.tithiDay(mi.start, 11, loc), sr = P.sunriseJd(...o.ymd, loc.lat, loc.lon, loc.tz);
        const s = P.siderealSun(sr);
        if (s >= 240 && s < 270) push(LIST.find(f => f.id === 'mukkoti'), o, mi.masa);
      }
      if (mi.masa === 7) { // Mondays of Kartika
        let d = P.localYMD(mi.start, loc.tz);
        for (let i = 0; i < 32; i++, d = P.addDays(d, 1)) {
          const sr = P.sunriseJd(...d, loc.lat, loc.lon, loc.tz);
          if (sr < mi.start) continue;
          if (sr >= mi.end) break;
          if (weekday(d) === 1) push(KARTIKA_MONDAY, { ymd: d }, 7);
        }
      }
    }
    for (let y = fromYMD[0]; y <= toYMD[0] + 1; y++) {
      const s = P.sankrantiDay(y, 9, loc);
      for (const f of LIST.filter(f => f.special === 'sankranti')) push(f, { ymd: P.addDays(s, f.offset) }, 9);
    }
    return out.sort((x, y) => P.jdOfYMD(x.ymd) - P.jdOfYMD(y.ymd) || (y.f.major ? 1 : 0) - (x.f.major ? 1 : 0));
  }

  return { LIST, RECURRING, between };
})(Panchang);
if (typeof module !== 'undefined') module.exports = Festivals;
