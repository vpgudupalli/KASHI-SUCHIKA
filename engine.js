// Telugu panchangam engine: tithi, amanta masa (with adhika), sunrise. No API needed.
const Panchang = (() => {
  const RAD = Math.PI / 180;
  const norm = x => ((x % 360) + 360) % 360;
  const sin = d => Math.sin(d * RAD), cos = d => Math.cos(d * RAD);

  // Julian day (UT) from JS Date
  const jdFromDate = dt => dt.getTime() / 86400000 + 2440587.5;
  const dateFromJd = jd => new Date((jd - 2440587.5) * 86400000);
  const tOf = jdUT => (jdUT + 70 / 86400 - 2451545.0) / 36525; // ~ΔT 70s

  function sunLon(jd) {
    const T = tOf(jd);
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
      + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
    const om = 125.04 - 1934.136 * T;
    return norm(L0 + C - 0.00569 - 0.00478 * sin(om));
  }

  // Meeus ch.47 main periodic terms: D, M, M', F, coeff (1e-6 deg)
  const MT = [
    [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],
    [0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],
    [0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],
    [0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
    [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],
    [4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],
    [1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],
    [2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],
    [2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],
    [2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],[4,-1,0,0,520],[1,0,-2,0,-487],
    [2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],
    [2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]
  ];

  function moonLon(jd) {
    const T = tOf(jd), T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
    const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    let s = 0;
    for (const [d, m, mp, f, c] of MT) {
      let k = c;
      if (m === 1 || m === -1) k *= E; else if (m === 2 || m === -2) k *= E * E;
      s += k * sin(d * D + m * M + mp * Mp + f * F);
    }
    const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.290 * T;
    s += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    const om = 125.04 - 1934.136 * T;
    return norm(Lp + s / 1e6 - 0.00478 * sin(om));
  }

  const elong = jd => norm(moonLon(jd) - sunLon(jd));
  const ayanamsa = jd => 23.853 + ((jd - 2451545.0) / 365.25) * 0.0139689; // Lahiri, approx
  const siderealSun = jd => norm(sunLon(jd) - ayanamsa(jd));

  // Find time near jdGuess (within ~±15 days) when elongation equals target angle
  function findElong(target, jdGuess) {
    let jd = jdGuess;
    for (let i = 0; i < 30; i++) {
      let diff = norm(target - elong(jd));
      if (diff > 180) diff -= 360;
      if (Math.abs(diff) < 1e-6) break;
      jd += diff / 12.19; // mean relative speed deg/day
    }
    return jd;
  }

  // New moon at or before jd
  function prevNewMoon(jd) {
    const e = elong(jd);
    let nm = findElong(0, jd - e / 12.19);
    if (nm > jd) nm = findElong(0, nm - 29.53);
    return nm;
  }

  const MASAS = ['Chaitra','Vaishakha','Jyeshtha','Ashadha','Shravana','Bhadrapada',
    'Ashvayuja','Kartika','Margashira','Pushya','Magha','Phalguna'];
  const MASAS_TE = ['చైత్రము','వైశాఖము','జ్యేష్ఠము','ఆషాఢము','శ్రావణము','భాద్రపదము',
    'ఆశ్వయుజము','కార్తీకము','మార్గశిరము','పుష్యము','మాఘము','ఫాల్గుణము'];
  const TITHIS = ['Pratipada','Vidiya','Tadiya','Chavithi','Panchami','Shashthi','Saptami',
    'Ashtami','Navami','Dashami','Ekadashi','Dvadashi','Trayodashi','Chaturdashi'];
  const TITHIS_TE = ['పాడ్యమి','విదియ','తదియ','చవితి','పంచమి','షష్ఠి','సప్తమి','అష్టమి',
    'నవమి','దశమి','ఏకాదశి','ద్వాదశి','త్రయోదశి','చతుర్దశి'];
  function tithiName(t) { // t: 1..30
    if (t === 15) return { en: 'Pournami', te: 'పౌర్ణమి' };
    if (t === 30) return { en: 'Amavasya', te: 'అమావాస్య' };
    const i = (t - 1) % 15;
    return { en: TITHIS[i], te: TITHIS_TE[i] };
  }

  // Lunar month starting at new moon nm: name by sun's sidereal rashi at nm; adhika if next nm in same rashi
  function monthInfo(nm) {
    const r1 = Math.floor(siderealSun(nm) / 30);
    const nm2 = findElong(0, nm + 29.53);
    const r2 = Math.floor(siderealSun(nm2) / 30);
    // rashi 11 (Meena) -> Chaitra(0), 0 (Mesha) -> Vaishakha(1), ...
    return { masa: (r1 + 1) % 12, adhika: r1 === r2, start: nm, end: nm2 };
  }

  // Sunrise (UT JD) for local civil date y-m-d at lat/lon, tz hours
  function sunriseJd(y, m, d, lat, lon, tz) {
    const N = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
    const lngHour = lon / 15;
    const t = N + (6 - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    const L = norm(M + 1.916 * sin(M) + 0.020 * sin(2 * M) + 282.634);
    let RA = norm(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD);
    RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
    RA /= 15;
    const sinDec = 0.39782 * sin(L), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (cos(90.833) - sinDec * sin(lat)) / (cosDec * cos(lat));
    const H = (360 - Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    const UT = ((T - lngHour) % 24 + 24) % 24;
    let jd = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 + UT / 24;
    if (UT + tz >= 24) jd -= 1; else if (UT + tz < 0) jd += 1; // keep sunrise on the local date
    return jd;
  }

  // Local civil date (y,m,d) of a UT JD for timezone tz
  function localYMD(jd, tz) {
    const dt = dateFromJd(jd + tz / 24);
    return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
  }
  const addDays = ([y, m, d], n) => {
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
  };

  // Panchang for a civil date at sunrise
  function dayInfo(y, m, d, loc) {
    const sr = sunriseJd(y, m, d, loc.lat, loc.lon, loc.tz);
    const tithi = Math.floor(elong(sr) / 12) + 1;
    const mi = monthInfo(prevNewMoon(sr));
    return { tithi, paksha: tithi <= 15 ? 'Shukla' : 'Krishna', masa: mi.masa, adhika: mi.adhika, sunrise: sr };
  }

  const jdOfYMD = ([y, m, d]) => Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;

  // Lunar months whose span touches [jdFrom, jdTo)
  function lunarMonths(jdFrom, jdTo) {
    const out = [];
    let nm = prevNewMoon(jdFrom);
    while (nm < jdTo) { const mi = monthInfo(nm); out.push(mi); nm = mi.end; }
    return out;
  }

  // Civil day for a tithi in the month starting at new moon nm: the first day whose sunrise
  // (+ kalaHours, e.g. 6 = midday, 18 = midnight) falls in it, else (kshaya) the day it begins
  function tithiDay(nm, tithi, loc, kalaHours = 0) {
    const tStart = tithi === 1 ? nm : findElong((tithi - 1) * 12, nm + (tithi - 0.5) * 0.984);
    const tEnd = findElong((tithi * 12) % 360, nm + (tithi + 0.5) * 0.984);
    let day = localYMD(tStart, loc.tz);
    for (let i = 0; i < 3; i++) {
      const sr = sunriseJd(day[0], day[1], day[2], loc.lat, loc.lon, loc.tz);
      const k = sr + kalaHours / 24;
      if (k >= tStart && k < tEnd) return { ymd: day, kshaya: false };
      day = addDays(day, 1);
    }
    if (kalaHours) return tithiDay(nm, tithi, loc, 0); // not running at that hour on any day: fall back to sunrise
    return { ymd: localYMD(tStart, loc.tz), kshaya: true };
  }

  // All civil dates in [fromYear, toYear] that fall on (masa, tithi), nija month only
  function occurrences(masa, tithi, fromYear, toYear, loc) {
    const months = lunarMonths(jdOfYMD([fromYear - 1, 11, 1]), jdOfYMD([toYear + 1, 2, 1]));
    return months.filter(mi => mi.masa === masa && !mi.adhika)
      .map(mi => tithiDay(mi.start, tithi, loc))
      .filter(o => o.ymd[0] >= fromYear && o.ymd[0] <= toYear);
  }

  // Day of a solar sankranti (sun enters sidereal rashi r) near Gregorian year y;
  // if it happens after ~sunset (18:00 local) the festival is the next day
  function sankrantiDay(y, r, loc) {
    const target = r * 30;
    let jd = jdOfYMD([y, 1, 1]) + norm(target - siderealSun(jdOfYMD([y, 1, 1]))) / 0.9856;
    for (let i = 0; i < 20; i++) {
      let diff = norm(target - siderealSun(jd)); if (diff > 180) diff -= 360;
      if (Math.abs(diff) < 1e-6) break; jd += diff / 0.9856;
    }
    const local = jd + loc.tz / 24, frac = local + 0.5 - Math.floor(local + 0.5);
    const ymd = localYMD(jd, loc.tz);
    return frac >= 0.75 ? addDays(ymd, 1) : ymd;
  }

  const SAMVATSARAS = ['Prabhava','Vibhava','Shukla','Pramoduta','Prajotpatti','Angirasa','Shrimukha','Bhava','Yuva','Dhatu',
    'Ishvara','Bahudhanya','Pramadhi','Vikrama','Vrusha','Chitrabhanu','Svabhanu','Tarana','Parthiva','Vyaya',
    'Sarvajit','Sarvadhari','Virodhi','Vikruti','Khara','Nandana','Vijaya','Jaya','Manmatha','Durmukhi',
    'Hevilambi','Vilambi','Vikari','Sharvari','Plava','Shubhakrut','Shobhakrut','Krodhi','Vishvavasu','Parabhava',
    'Plavanga','Kilaka','Saumya','Sadharana','Virodhikrut','Paridhavi','Pramadicha','Ananda','Rakshasa','Nala',
    'Pingala','Kalayukti','Siddharthi','Raudri','Durmati','Dundubhi','Rudhirodgari','Raktakshi','Krodhana','Akshaya'];
  const SAMVATSARAS_TE = ['ప్రభవ','విభవ','శుక్ల','ప్రమోదూత','ప్రజోత్పత్తి','ఆంగీరస','శ్రీముఖ','భావ','యువ','ధాత',
    'ఈశ్వర','బహుధాన్య','ప్రమాది','విక్రమ','వృష','చిత్రభాను','స్వభాను','తారణ','పార్థివ','వ్యయ',
    'సర్వజిత్','సర్వధారి','విరోధి','వికృతి','ఖర','నందన','విజయ','జయ','మన్మథ','దుర్ముఖి',
    'హేవిళంబి','విళంబి','వికారి','శార్వరి','ప్లవ','శుభకృత్','శోభకృత్','క్రోధి','విశ్వావసు','పరాభవ',
    'ప్లవంగ','కీలక','సౌమ్య','సాధారణ','విరోధికృత్','పరిధావి','ప్రమాదీచ','ఆనంద','రాక్షస','నల',
    'పింగళ','కాళయుక్తి','సిద్ధార్థి','రౌద్రి','దుర్మతి','దుందుభి','రుధిరోద్గారి','రక్తాక్షి','క్రోధన','అక్షయ'];
  // Telugu year (from Ugadi) for a civil date and its lunar month
  function samvatsara(ymd, masa) {
    const y = ymd[0] - (ymd[1] <= 4 && masa >= 9 ? 1 : 0);
    const i = (((y - 1987) % 60) + 60) % 60; // 1987-88 was Prabhava
    return { en: SAMVATSARAS[i], te: SAMVATSARAS_TE[i], startYear: y };
  }

  return { dayInfo, occurrences, lunarMonths, tithiDay, sankrantiDay, samvatsara, siderealSun, sunriseJd,
    tithiName, MASAS, MASAS_TE, dateFromJd, localYMD, addDays, jdOfYMD };
})();
if (typeof module !== 'undefined') module.exports = Panchang;
