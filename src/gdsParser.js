// Multi-Layer Aviation PNR & Flight Segment Detection Engine (v2 - Ultra-Resilient)
// Handles:
// - Sabre Red 360 Cryptic (*A, *I, VI*, married *HK1, concatenated 705Y, 12h 700A/1245P, tight monospace OCR glue!)
// - Sabre Red 360 Mixed Desktop Screenshots (White UI + Dark/Blue Terminal)
// - Sabre Red 360 Graphical View (Trip Summary / Graphical Itinerary rows & cards)
// - Amadeus Cryptic (RP/..., terminal column before time, +1 overnight)
// - Galileo / Travelport Smartpoint (1. dot, HS1/HK1, #0050 overnight)
// - Hitit (PIA/AirSial), Airblue, Fly Jinnah, SereneAir, Airline Websites, OTAs & WhatsApp Screenshots

const { enrichBookingData, AIRPORTS, AIRLINES, PREFIX_TO_AIRLINE } = require('./airportsDb');

const CITY_ENTRIES = [];
for (const [iata, info] of Object.entries(AIRPORTS)) {
  const cityKey = info.city.toUpperCase();
  if (!CITY_ENTRIES.some(e => e.city === cityKey)) {
    CITY_ENTRIES.push({ city: cityKey, iata });
  }
}
[
  ['MEDINA', 'MED'],
  ['MADINA', 'MED'],
  ['MAKKAH', 'JED'],
  ['HEATHROW', 'LHR'],
  ['GATWICK', 'LGW'],
  ['STANSTED', 'STN'],
  ['SHARJAH', 'SHJ'],
  ['ABUDHABI', 'AUH'],
  ['RAS ALKHAIMAH', 'RKT'],
  ['QASSIM', 'ELQ'],
  ['GASSIM', 'ELQ'],
  ['RIYADH', 'RUH'],
  ['JEDDAH', 'JED'],
  ['DAMMAM', 'DMM'],
  ['KARACHI', 'KHI'],
  ['LAHORE', 'LHE'],
  ['ISLAMABAD', 'ISB'],
  ['PESHAWAR', 'PEW'],
  ['MULTAN', 'MUX'],
  ['SIALKOT', 'SKT'],
  ['FAISALABAD', 'LYP'],
  ['QUETTA', 'UET']
].forEach(([city, iata]) => {
  if (!CITY_ENTRIES.some(e => e.city === city)) {
    CITY_ENTRIES.push({ city, iata });
  }
});
CITY_ENTRIES.sort((a, b) => b.city.length - a.city.length);

const AIRLINE_KEYWORDS = [
  ['PAKISTAN INTERNATIONAL', 'PK'],
  ['SAUDI ARABIAN', 'SV'],
  ['SAUDIA', 'SV'],
  ['FLY JINNAH', '9P'],
  ['FLYJINNAH', '9P'],
  ['AIRBLUE', 'PA'],
  ['AIR BLUE', 'PA'],
  ['SERENE AIR', 'ER'],
  ['SERENEAIR', 'ER'],
  ['AIRSIAL', 'PF'],
  ['AIR SIAL', 'PF'],
  ['EMIRATES', 'EK'],
  ['QATAR AIRWAYS', 'QR'],
  ['ETIHAD', 'EY'],
  ['FLYDUBAI', 'FZ'],
  ['FLY DUBAI', 'FZ'],
  ['AIR ARABIA', 'G9'],
  ['FLYNAS', 'XY'],
  ['FLYADEAL', 'F3'],
  ['TURKISH AIRLINES', 'TK'],
  ['GULF AIR', 'GF'],
  ['OMAN AIR', 'WY'],
  ['SALAMAIR', 'OV'],
  ['SALAM AIR', 'OV'],
  ['KUWAIT AIRWAYS', 'KU'],
  ['JAZEERA', 'J9'],
  ['BRITISH AIRWAYS', 'BA'],
  ['VIRGIN ATLANTIC', 'VS'],
  ['SRILANKAN', 'UL'],
  ['THAI AIRWAYS', 'TG'],
  ['MALAYSIA AIRLINES', 'MH'],
  ['BATIK AIR', 'OD'],
  ['SINGAPORE AIRLINES', 'SQ'],
  ['CATHAY PACIFIC', 'CX'],
  ['CHINA SOUTHERN', 'CZ'],
  ['AIR CHINA', 'CA'],
  ['LUFTHANSA', 'LH'],
  ['AIR FRANCE', 'AF'],
  ['AMERICAN AIRLINES', 'AA'],
  ['UNITED AIRLINES', 'UA'],
  ['DELTA AIR', 'DL'],
  ['AIR CANADA', 'AC'],
  ['PEGASUS', 'PC'],
  ['AZERBAIJAN', 'J2'],
  ['UZBEKISTAN', 'HY'],
  ['PIA', 'PK']
];

const MONTHS_RE = 'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';
const GDS_STATUS_CODES = 'HK|KK|SS|TK|GK|DK|YK|HS|RR|OK|HL|WL|UU|US|PN|NN|RQ|HX|UN|UC|NO|WK|SC|KL';

const NON_AIRPORT_3 = new Set([
  'THE', 'AND', 'FOR', 'PAX', 'PNR', 'TKT', 'ADT', 'CNN', 'CHD', 'INF', 'MR', 'MRS',
  'MSTR', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'JAN', 'FEB', 'MAR', 'APR',
  'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'AIR', 'FLT', 'DEP', 'ARR',
  'VIA', 'NON', 'HRS', 'MIN', 'BAG', 'KGS', 'PCS', 'PKR', 'USD', 'SAR', 'AED', 'GBP',
  'EUR', 'TAX', 'FEE', 'NET', 'TOT', 'REF', 'LOC', 'GDS', 'PCC', 'SEG', 'OUT', 'RET',
  'ONE', 'WAY', 'ALL', 'NEW', 'OLD', 'YES', 'NOT', 'TBA', 'TBD', 'CHK', 'REQ', 'JET',
  'VIP', 'OSI', 'SSR', 'DOC', 'CTC', 'FAX', 'TEL', 'WEB', 'APP', 'PDF', 'PNL', 'END'
]);

function normalizeLineOcr(line = '') {
  let s = String(line)
    .replace(/[|¦«»—–]/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/N0V/gi, 'NOV')
    .replace(/0CT/gi, 'OCT')
    .replace(/FE8/gi, 'FEB')
    .replace(/AU6/gi, 'AUG')
    .replace(/5EP/gi, 'SEP')
    .replace(/DE0/gi, 'DEC');

  // Fix OCR I/l/O in 1-2 digit day right before 3-letter Month (even if glued to previous char!)
  s = s.replace(
    new RegExp(`(^|[^0-9])([0-9OIl]{1,2})(\\s*(?:${MONTHS_RE}))`, 'gi'),
    (_, pre, dayRaw, monPart) => {
      // Only convert O/I/l if at least one char looks like a valid day 01..31 after conversion
      const fixedDay = dayRaw.replace(/O/gi, '0').replace(/[Il]/g, '1');
      const num = parseInt(fixedDay, 10);
      if (num >= 1 && num <= 31) {
        return `${pre}${fixedDay}${monPart.toUpperCase()}`;
      }
      return _;
    }
  );

  // Fix OCR status digit misreads e.g. HKI, HKl, HK!, HKZ -> HK1/HK2
  s = s.replace(
    new RegExp(`(\\*|\\b)(${GDS_STATUS_CODES})([Il!Z])(?=\\s|$|\\d)`, 'gi'),
    (_, pre, code, d) => `${pre}${code.toUpperCase()}${d.toUpperCase() === 'Z' ? '2' : '1'}`
  );

  return s.replace(/\s+/g, ' ').trim();
}

function parseTimeToken(tok = '') {
  if (!tok) return null;
  let raw = String(tok).trim().toUpperCase();
  let nextDay = false;
  if (/^[#*]/.test(raw) || /\+1$|#1$/.test(raw)) {
    nextDay = true;
  }
  raw = raw.replace(/^[#*+]+/, '').replace(/[+#-]\d+$/, '');
  if (/^[A-Z]{3,}$/.test(raw)) return null;

  const m = raw.match(/^([0-9OIlS]{1,2}):?([0-9OIlS]{2})(AM|PM|A|P|N|M)?$/);
  if (!m) return null;

  const fixDigits = s => s.replace(/O/g, '0').replace(/[Il]/g, '1').replace(/S/g, '5');
  let hh = parseInt(fixDigits(m[1]), 10);
  const mm = parseInt(fixDigits(m[2]), 10);
  const ap = m[3] || '';

  if (isNaN(hh) || isNaN(mm) || mm > 59 || hh > 24) return null;
  if (hh === 24 && mm === 0) hh = 0;

  if (ap === 'N') hh = 12;
  else if (ap === 'M') hh = 0;
  else if ((ap === 'PM' || ap === 'P') && hh < 12) hh += 12;
  else if ((ap === 'AM' || ap === 'A') && hh === 12) hh = 0;

  if (hh > 23) return null;
  return {
    time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    nextDay
  };
}

function addOneDayToDateStr(dateStr) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const m = String(dateStr || '').toUpperCase().match(/(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{2,4})?/);
  if (!m) return dateStr;
  const d = parseInt(m[1], 10);
  const monIdx = months.indexOf(m[2]);
  let yr = m[3] ? parseInt(m[3], 10) : new Date().getUTCFullYear();
  if (yr < 100) yr += 2000;
  const dt = new Date(Date.UTC(yr, monIdx, d + 1));
  return `${String(dt.getUTCDate()).padStart(2, '0')}${months[dt.getUTCMonth()]}${dt.getUTCFullYear()}`;
}

/**
 * LAYER 1: Universal GDS Cryptic Segment Line Scanner
 * Handles tight monospace OCR glue (1SV 705Y18NOV3 KHIJED*HK10415 0625), 12h/24h clocks, Amadeus, Sabre, Galileo, VI*
 */
function tryParseGdsSegmentLine(rawLine, nextRawLine = '', ticketCarrierHint = '') {
  const line = normalizeLineOcr(rawLine);
  if (line.length < 14) return null;

  if (/^(?:TKT\/TIME|1\.T-|TE\s+\d{3}|FA\s+PAX|SSR\s+DOCS|3DOCS|OSI\s+|PHONES|REMARKS|GENERAL\s+FACTS)/i.test(line)) {
    return null;
  }

  // Match DDMMM (with optional 4-digit year 202x or 2-digit year 24-35, without eating 1-digit GDS day-of-week 1..7!)
  const dateRegex = new RegExp(`(?:^|[^0-9])(\\d{1,2})\\s*(${MONTHS_RE})(20\\d{2}|2[4-9]|3[0-5])?`, 'ig');
  let dm;

  while ((dm = dateRegex.exec(line)) !== null) {
    const fullMatch = dm[0];
    const leadCharLen = fullMatch.length - (dm[1].length + (fullMatch.match(/\s+/)?.[0]?.length || 0) + dm[2].length + (dm[3]?.length || 0));
    const dateStartIdx = dm.index + Math.max(0, leadCharLen);

    const depDateRaw = `${dm[1]}${dm[2].toUpperCase()}${dm[3] || ''}`;
    const beforeDate = line.slice(0, dateStartIdx).trim();
    const afterDate = line.slice(dm.index + fullMatch.length).trim();

    if (!beforeDate || !afterDate) continue;

    // Carrier (2 chars with >=1 letter) + Flight Number (1-4 digits) + Booking Class (attached or spaced)
    const fltTailRegex = /(?:^|\s|\d+[.\s]*)([A-Z]{2}|[0-9][A-Z]|[A-Z][0-9])\s*([0-9OIl]{1,4})\s*([A-Z])?\s*$/i;
    const fm = beforeDate.match(fltTailRegex);
    if (!fm) continue;

    let carrier = fm[1].toUpperCase();
    const fltDigits = fm[2].replace(/O/gi, '0').replace(/[Il]/g, '1').replace(/^0+(\d{3,4})$/, '$1');
    const bookingClass = (fm[3] || 'Y').toUpperCase();

    if (!/^\d{1,4}$/.test(fltDigits)) continue;

    // Strip optional day-of-week right after date (spaced OR glued before 6-letter city pair!)
    let rem = afterDate
      .replace(/^(?:[1-7]|MO|TU|WE|TH|FR|SA|SU)(?:\s+|(?=[A-Z]{6}))/i, '')
      .replace(/^[MTWQFJS](?:\s+|(?=[A-Z]{6}\b|\*[A-Z]{2}))/i, '');

    // Match City Pair + optional Status (*HK1, HK12, SS1, or glued HK10415!)
    const cpRegex = new RegExp(
      `^([A-Z]{3})[\\s/*>-]*([A-Z]{3})[\\s*.-]*(?:(${GDS_STATUS_CODES})(\\d{1,2}(?=\\s|$|\\D)|\\d(?=\\d{4}))?)?(.*)$`,
      'i'
    );
    const cpm = rem.match(cpRegex);
    if (!cpm) continue;

    const orig = cpm[1].toUpperCase();
    const dest = cpm[2].toUpperCase();
    if (orig === dest) continue;
    if (NON_AIRPORT_3.has(orig) && NON_AIRPORT_3.has(dest)) continue;

    const statusCode = (cpm[3] || 'HK').toUpperCase();
    const tailAfterStatus = (cpm[5] || '').trim();

    // Expand glued 8-digit time pairs e.g. "04150625" -> "0415 0625"
    const rawTokens = tailAfterStatus.split(/\s+/).filter(Boolean);
    const tokens = [];
    for (const rt of rawTokens) {
      const eightM = rt.match(/^([0-9OIl]{4})([0-9OIl]{4})$/);
      if (eightM) {
        tokens.push(eightM[1], eightM[2]);
      } else {
        tokens.push(rt);
      }
    }

    let fromTerminal = 'Not Available';
    let toTerminal = 'Not Available';
    let depTimeObj = null;
    let arrTimeObj = null;
    let timeEndIdx = -1;

    for (let tIdx = 0; tIdx < Math.min(tokens.length, 7); tIdx++) {
      const tok = tokens[tIdx];
      if (!depTimeObj && /^[A-Z0-9]{1,2}$/i.test(tok) && parseTimeToken(tokens[tIdx + 1])) {
        fromTerminal = `TERMINAL ${tok.toUpperCase()}`;
        continue;
      }
      const parsedT = parseTimeToken(tok);
      if (parsedT) {
        if (!depTimeObj) {
          depTimeObj = parsedT;
        } else if (!arrTimeObj) {
          arrTimeObj = parsedT;
          timeEndIdx = tIdx;
          break;
        }
      }
    }

    const restStr = timeEndIdx >= 0 ? tokens.slice(timeEndIdx + 1).join(' ') : tailAfterStatus;
    let arrDateRaw = depDateRaw;

    const arrDateM = restStr.match(new RegExp(`\\b(\\d{1,2}\\s*(?:${MONTHS_RE})\\d{0,4})\\b`, 'i'));
    if (arrDateM) {
      arrDateRaw = arrDateM[1].toUpperCase().replace(/\s+/g, '');
    } else if (arrTimeObj?.nextDay) {
      arrDateRaw = addOneDayToDateStr(depDateRaw);
    }

    let segAirPnr = '';
    const dcM = line.match(/\/DC([A-Z0-9]{2})\*([A-Z0-9]{5,8})/i) || restStr.match(/\b([A-Z0-9]{2})\/([A-Z0-9]{5,8})\b/i);
    if (dcM) {
      const dcCarrier = dcM[1].toUpperCase();
      if (AIRLINES[dcCarrier]) carrier = dcCarrier;
      segAirPnr = dcM[2].toUpperCase();
    } else if (!AIRLINES[carrier] && ticketCarrierHint && carrier[0] === ticketCarrierHint[0]) {
      carrier = ticketCarrierHint;
    }

    let aircraft = 'JET AIRCRAFT';
    const equipMap = {
      '77W': 'BOEING 777-300ER',
      '773': 'BOEING 777-300',
      '772': 'BOEING 777-200',
      '788': 'BOEING 787-8 DREAMLINER',
      '789': 'BOEING 787-9 DREAMLINER',
      '738': 'BOEING 737-800',
      '388': 'AIRBUS A380-800',
      '359': 'AIRBUS A350-900',
      '333': 'AIRBUS A330-300',
      '332': 'AIRBUS A330-200',
      '321': 'AIRBUS A321',
      '32N': 'AIRBUS A320NEO',
      '320': 'AIRBUS A320',
      'AT7': 'ATR 72'
    };
    for (const [eqCode, eqName] of Object.entries(equipMap)) {
      if (new RegExp(`\\b${eqCode}\\b`, 'i').test(restStr)) {
        aircraft = eqName;
        break;
      }
    }

    const combinedSub = `${line} ${nextRawLine || ''}`;
    const termMatches = [...combinedSub.matchAll(/TERMINAL\s*([A-Z0-9]{1,3})/gi)];
    if (termMatches[0] && fromTerminal === 'Not Available') {
      fromTerminal = `TERMINAL ${termMatches[0][1].toUpperCase()}`;
    }
    if (termMatches[1]) {
      toTerminal = `TERMINAL ${termMatches[1][1].toUpperCase()}`;
    }

    const acMatch = combinedSub.match(/\b(BOEING\s*7\d{2}(?:-\d{3}[A-Z]*)?|AIRBUS\s*A3\d{2}(?:-\d{3}|NEO)?|ATR\s*\d{2}|EMBRAER\s*E?\d{3})\b/i);
    if (acMatch) aircraft = acMatch[1].toUpperCase();

    return {
      airlineCode: carrier,
      flightNumber: `${carrier} ${fltDigits}`,
      bookingClass,
      departureDate: depDateRaw,
      arrivalDate: arrDateRaw,
      fromCode: orig,
      toCode: dest,
      fromTerminal,
      toTerminal,
      aircraft,
      status: statusCode,
      departureTime: depTimeObj ? depTimeObj.time : '',
      arrivalTime: arrTimeObj ? arrTimeObj.time : '',
      airlinePnr: segAirPnr
    };
  }

  return null;
}

function extractAirportsInOrder(blockText = '') {
  const results = [];
  const upper = String(blockText).toUpperCase();

  const parenRegex = /[\(\[]([A-Z]{3})[\)\]]/g;
  let m;
  while ((m = parenRegex.exec(upper)) !== null) {
    const code = m[1];
    if (AIRPORTS[code] || !NON_AIRPORT_3.has(code)) {
      results.push({ index: m.index, code });
    }
  }

  const wordRegex = /\b([A-Z]{3})\b/g;
  while ((m = wordRegex.exec(upper)) !== null) {
    const code = m[1];
    if (AIRPORTS[code] && !results.some(r => Math.abs(r.index - m.index) <= 3 && r.code === code)) {
      results.push({ index: m.index, code });
    }
  }

  const sixRegex = /\b([A-Z]{3})([A-Z]{3})\b/g;
  while ((m = sixRegex.exec(upper)) !== null) {
    if (AIRPORTS[m[1]] && AIRPORTS[m[2]] && m[1] !== m[2]) {
      results.push({ index: m.index, code: m[1] });
      results.push({ index: m.index + 3, code: m[2] });
    }
  }

  if (results.length < 2) {
    for (const { city, iata } of CITY_ENTRIES) {
      const cm = new RegExp(`\\b${city}\\b`, 'i').exec(upper);
      if (cm) {
        results.push({ index: cm.index, code: iata });
      }
    }
  }

  results.sort((a, b) => a.index - b.index);

  const deduped = [];
  for (const item of results) {
    if (deduped.length === 0 || deduped[deduped.length - 1].code !== item.code || item.index - deduped[deduped.length - 1].index > 35) {
      deduped.push(item);
    }
  }
  return deduped.map(d => d.code);
}

function extractFlightNumbersInOrder(text = '') {
  const found = [];
  const upper = String(text).toUpperCase();

  const codeRegex = /\b([A-Z]{2}|[0-9][A-Z]|[A-Z][0-9])\s*[-–]?\s*(\d{1,4})[A-Z]?\b/g;
  let m;
  while ((m = codeRegex.exec(upper)) !== null) {
    const carrier = m[1];
    const num = m[2];
    if (!AIRLINES[carrier]) continue;
    if (['IN', 'ON', 'AT', 'AS', 'OS', 'LO', 'ME', 'IR', 'AY'].includes(carrier) && /^202\d$/.test(num)) continue;
    const lineStart = upper.lastIndexOf('\n', m.index) + 1;
    const lineEnd = upper.indexOf('\n', m.index);
    const fullLine = upper.slice(lineStart, lineEnd === -1 ? upper.length : lineEnd);
    if (/PHONES|TKT|TICKET\s*\d|^\s*TE\s/i.test(fullLine)) continue;

    found.push({
      index: m.index,
      lineIdx: upper.slice(0, m.index).split('\n').length - 1,
      airlineCode: carrier,
      flightNumber: `${carrier} ${num}`
    });
  }

  if (found.length === 0) {
    for (const [kw, code] of AIRLINE_KEYWORDS) {
      const kwRe = new RegExp(`\\b${kw}(?:\\s+FLIGHT)?\\s*[:#-]?\\s*(\\d{1,4})\\b`, 'ig');
      let km;
      while ((km = kwRe.exec(upper)) !== null) {
        found.push({
          index: km.index,
          lineIdx: upper.slice(0, km.index).split('\n').length - 1,
          airlineCode: code,
          flightNumber: `${code} ${km[1]}`
        });
      }
    }
  }

  found.sort((a, b) => a.index - b.index);
  return found.filter((f, i) => i === 0 || f.flightNumber !== found[i - 1].flightNumber || f.lineIdx - found[i - 1].lineIdx > 3);
}

function extractDatesFromText(text = '') {
  const out = [];
  const norm = normalizeLineOcr(text);
  const re = new RegExp(
    `\\b(\\d{1,2}[\\s-]+(?:${MONTHS_RE})[A-Z]*[\\s,-]*\\d{0,4}|(?:${MONTHS_RE})[A-Z]*[\\s.-]+\\d{1,2}(?:ST|ND|RD|TH)?[\\s,.-]*\\d{2,4}|\\d{1,2}(?:${MONTHS_RE})\\d{0,4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\b`,
    'ig'
  );
  let m;
  while ((m = re.exec(norm)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

function extractTimesFromText(text = '') {
  const out = [];
  const re = /\b(\d{1,2}:\d{2}(?:\s*[AP]M)?|\d{3,4}\s*(?:AM|PM|HRS))\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const parsed = parseTimeToken(m[1].replace(/\s*HRS$/i, ''));
    if (parsed) out.push(parsed.time);
  }
  return out;
}

/**
 * LAYER 2: Sabre Red 360 Graphical View, Airline Web, Hitit, Airblue, Fly Jinnah & OTA Card Parser
 */
function extractGraphicalOrPortalSegments(lines, fullText, defaultBaggage, ticketCarrierHint) {
  const flights = [];
  const fltAnchors = extractFlightNumbersInOrder(fullText);
  const allDates = extractDatesFromText(fullText);

  if (fltAnchors.length > 0) {
    let minAllowedStart = 0;
    fltAnchors.forEach((anchor, idx) => {
      const nextAnchorLine = fltAnchors[idx + 1] ? fltAnchors[idx + 1].lineIdx : lines.length;
      // First look forward from flight anchor (Flight-at-top card layout)
      let startLine = Math.max(minAllowedStart, anchor.lineIdx);
      let endLine = Math.min(lines.length, Math.min(anchor.lineIdx + 6, nextAnchorLine));
      let windowText = lines.slice(startLine, Math.max(startLine + 1, endLine)).join('\n');
      let windowAirports = extractAirportsInOrder(windowText);

      // If airports were placed ABOVE the flight number (Route-at-top card layout!), expand upward safely up to minAllowedStart!
      if (windowAirports.length < 2) {
        const upStart = Math.max(minAllowedStart, anchor.lineIdx - 4);
        const upEnd = Math.min(lines.length, Math.min(anchor.lineIdx + 3, nextAnchorLine));
        windowText = lines.slice(upStart, Math.max(upStart + 1, upEnd)).join('\n');
        windowAirports = extractAirportsInOrder(windowText);
        endLine = upEnd;
      }

      minAllowedStart = Math.max(anchor.lineIdx + 1, endLine);

      const windowTimes = extractTimesFromText(windowText);
      const windowDates = extractDatesFromText(windowText);

      const orig = windowAirports[0] || '';
      const dest = windowAirports[1] || '';

      if (orig && dest && orig !== dest) {
        const termMatches = [...windowText.matchAll(/TERMINAL\s*([A-Z0-9]{1,3})/gi)];
        const acMatch = windowText.match(/\b(BOEING\s*7\d{2}(?:-\d{3}[A-Z]*)?|AIRBUS\s*A3\d{2}(?:-\d{3}|NEO)?|ATR\s*\d{2})\b/i);
        const clsMatch = windowText.match(/\bCLASS\s*[:#-]?\s*([A-Z])\b/i);

        flights.push({
          airlineCode: anchor.airlineCode,
          flightNumber: anchor.flightNumber,
          fromCode: orig,
          toCode: dest,
          fromTerminal: termMatches[0] ? `TERMINAL ${termMatches[0][1].toUpperCase()}` : 'Not Available',
          toTerminal: termMatches[1] ? `TERMINAL ${termMatches[1][1].toUpperCase()}` : 'Not Available',
          departureDate: windowDates[0] || allDates[idx] || allDates[0] || '',
          arrivalDate: windowDates[1] || windowDates[0] || allDates[idx] || allDates[0] || '',
          departureTime: windowTimes[0] || '',
          arrivalTime: windowTimes[1] || '',
          bookingClass: clsMatch ? clsMatch[1].toUpperCase() : (/BUSINESS/i.test(windowText) ? 'J' : 'Y'),
          aircraft: acMatch ? acMatch[1].toUpperCase() : 'JET AIRCRAFT',
          status: /HOLD|PENDING/i.test(windowText) ? 'On Hold' : 'Confirmed',
          baggage: defaultBaggage || '30 KG'
        });
      }
    });
  }

  if (flights.length > 0) return flights;

  const globalAirports = extractAirportsInOrder(fullText);
  const globalTimes = extractTimesFromText(fullText);

  if (globalAirports.length >= 2) {
    const pairs = [];
    if (globalAirports.length === 3 && globalAirports[0] === globalAirports[2]) {
      pairs.push([globalAirports[0], globalAirports[1]]);
      pairs.push([globalAirports[1], globalAirports[2]]);
    } else {
      for (let i = 0; i + 1 < globalAirports.length && pairs.length < 6; i += 2) {
        if (globalAirports[i] !== globalAirports[i + 1]) {
          pairs.push([globalAirports[i], globalAirports[i + 1]]);
        }
      }
    }

    pairs.forEach(([orig, dest], idx) => {
      const fm = fltAnchors[idx] || fltAnchors[0] || null;
      const carrier = fm ? fm.airlineCode : (ticketCarrierHint || '');
      flights.push({
        airlineCode: carrier,
        flightNumber: fm ? fm.flightNumber : (carrier ? `${carrier} 10${idx + 1}` : 'FLIGHT'),
        fromCode: orig,
        toCode: dest,
        departureDate: allDates[idx] || allDates[0] || '',
        arrivalDate: allDates[idx] || allDates[0] || '',
        departureTime: globalTimes[idx * 2] || '',
        arrivalTime: globalTimes[idx * 2 + 1] || '',
        bookingClass: /BUSINESS/i.test(fullText) ? 'J' : 'Y',
        status: 'Confirmed',
        baggage: defaultBaggage || '30 KG'
      });
    });
  }

  return flights;
}

function parseGdsOrBookingText(rawText = '') {
  // Note: split on newline BEFORE collapsing spaces per line!
  const text = String(rawText || '').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let pnr = '';
  let airlinePnr = '';
  let defaultBaggage = '';
  const passengers = [];
  const tickets = [];
  const seatsFound = [];
  let flights = [];
  const remarks = [];
  const fare = {
    showFare: false,
    currency: 'PKR',
    baseFare: '',
    taxes: '',
    totalFare: '',
    paymentMethod: 'CASH / INVOICE'
  };

  // 1. Ticket Numbers
  const tktRegex = /\b(\d{3}[-\s]?\d{10})\b/g;
  let tm;
  while ((tm = tktRegex.exec(text)) !== null) {
    const cleanTkt = tm[1].replace(/\s+/g, '');
    const normalized = cleanTkt.includes('-') ? cleanTkt : `${cleanTkt.slice(0, 3)}-${cleanTkt.slice(3)}`;
    if (!tickets.includes(normalized)) tickets.push(normalized);
  }
  const ticketCarrierHint = tickets[0] ? (PREFIX_TO_AIRLINE[tickets[0].slice(0, 3)] || '') : '';

  // 2. Seats
  const seatRegex = /\bSEAT[S]?\s*[:#-]?\s*(\d{1,2}[A-K])\b/gi;
  let seatM;
  while ((seatM = seatRegex.exec(text)) !== null) {
    seatsFound.push(seatM[1].toUpperCase());
  }

  // 3. Baggage
  const bagMatch = text.match(/BAGGAGE\s*[:#-]?\s*(\d\s*PC(?:\s*\(\d+\s*KG(?:\s*EACH)?\))?|\d{2}\s*KG)/i)
    || text.match(/\b(\d\s*PC(?:\s*\(\d+\s*KG(?:\s*EACH)?\))?|\d{2}\s*KG|\d{2}K)\b/i);
  if (bagMatch) {
    defaultBaggage = bagMatch[1].toUpperCase().replace(/^(\d{2})K$/, '$1 KG');
  }

  // 4. Fare
  const totalFareMatch = text.match(/TOTAL\s*(?:FARE|AMOUNT|PRICE)?\s*[:#-]?\s*(PKR|USD|AED|SAR|GBP|EUR|CAD)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (totalFareMatch) {
    if (totalFareMatch[1]) fare.currency = totalFareMatch[1].toUpperCase();
    fare.totalFare = totalFareMatch[2];
  }
  const baseFareMatch = text.match(/BASE\s*FARE\s*[:#-]?\s*(?:PKR|USD|AED|SAR|GBP|EUR|CAD)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (baseFareMatch) fare.baseFare = baseFareMatch[1];
  const taxMatch = text.match(/TAX(?:ES)?\s*[:#-]?\s*(?:PKR|USD|AED|SAR|GBP|EUR|CAD)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (taxMatch) fare.taxes = taxMatch[1];

  // 5. Airline Locator
  const dcMatch = text.match(/\/DC([A-Z0-9]{2})\*([A-Z0-9]{5,8})/i);
  if (dcMatch) {
    airlinePnr = `${dcMatch[2].toUpperCase()} (${dcMatch[1].toUpperCase()})`;
  } else {
    const airLocMatch = text.match(/(?:AIRLINE\s*(?:PNR|REF|RESERVATION\s*CODE|LOCATOR|CONFIRMATION)|VENDOR\s*LOCATOR)\s*[:#-]?\s*([A-Z0-9]{5,8})/i);
    if (airLocMatch) airlinePnr = airLocMatch[1].toUpperCase();
  }

  // 6. Sabre / GDS PNR
  const pnrLabeled = text.match(/\b(?:SABRE\s*PNR|GDS\s*PNR|RESERVATION\s*CODE|BOOKING\s*(?:REFERENCE|REF|CODE|ID)|RECORD\s*LOCATOR|PNR(?:\s*(?:NO|CODE|NUMBER))?)(?:\s*\([A-Z]+\))?\s*[:#-]?\s*\b([A-Z0-9]{6})\b/i);
  if (pnrLabeled) {
    pnr = pnrLabeled[1].toUpperCase();
  } else {
    for (const line of lines.slice(0, 8)) {
      const cleanTop = line.replace(/^[|¦\s]+|[|¦\s]+$/g, '');
      const m = cleanTop.match(/^([A-Z0-9]{6})$/);
      if (m && !/^(DEPART|ARRIVE|FLIGHT|STATUS|TICKET|RETURN|ECONOM|TRAVEL|HEADER)$/.test(m[1])) {
        pnr = m[1];
        break;
      }
    }
    if (!pnr) {
      const rpMatch = text.match(/\bRP\/[A-Z0-9]+\/.*?\s+([A-Z0-9]{6})\s*$/m);
      if (rpMatch) pnr = rpMatch[1].toUpperCase();
    }
  }

  // 7. Passengers
  const gdsPaxRegex = /(?:^|\s)(?:\d+\.\d+|\d+\.)\s*([A-Z][A-Z\s'-]{1,28}\/[A-Z][A-Z\s'-]{1,32}?(?:\s+(?:MR|MRS|MS|MISS|MSTR|DR|CHD|INF))?)(?:\*[A-Z0-9]+)?(?=\s+\d+\.\d+|\s+\d+\.|$)/gi;
  for (const line of lines) {
    if (tryParseGdsSegmentLine(line, '', ticketCarrierHint)) continue;
    let pm;
    while ((pm = gdsPaxRegex.exec(line)) !== null) {
      const rawName = pm[1].trim().toUpperCase();
      if (rawName.length > 4 && !passengers.some(p => p.name === rawName)) {
        let type = 'ADT';
        if (/\b(MSTR|MISS)\b/.test(rawName) || /\*C\d+/i.test(line)) type = 'CNN';
        if (/^I\/|\bINF\b/i.test(line)) type = 'INF';
        passengers.push({ name: rawName, type });
      }
    }
  }

  if (passengers.length === 0) {
    for (const line of lines) {
      const webPax = line.match(/(?:PASSENGER(?:S|\s*NAME)?|TRAVELER|PAX|PREPARED\s*FOR|GUEST\s*NAME)\s*[:#-]?\s*([A-Z][A-Z\s/.]{4,55})/i);
      if (webPax) {
        const candidate = webPax[1].trim().toUpperCase();
        if (!/^(DETAILS|INFORMATION|LIST|SUMMARY|TYPE)/.test(candidate)) {
          passengers.push({ name: candidate, type: 'ADT' });
        }
      } else if (/^[A-Z]{2,20}\/[A-Z\s]{2,25}\s+(MR|MRS|MS|MISS|MSTR)\b/i.test(line)) {
        passengers.push({ name: line.toUpperCase(), type: /\b(MSTR|MISS)\b/i.test(line) ? 'CNN' : 'ADT' });
      }
    }
  }

  // 8. LAYER 1: Universal GDS Cryptic Segment Extraction
  for (let i = 0; i < lines.length; i++) {
    const parsedSeg = tryParseGdsSegmentLine(lines[i], lines[i + 1] || '', ticketCarrierHint);
    if (parsedSeg) {
      parsedSeg.baggage = defaultBaggage || '30 KG';
      const isDup = flights.some(
        f => f.fromCode === parsedSeg.fromCode && f.toCode === parsedSeg.toCode && f.flightNumber === parsedSeg.flightNumber
      );
      if (!isDup) {
        flights.push(parsedSeg);
      }
    }
  }

  // 9. LAYER 2: Sabre Red 360 Graphical View, Hitit, Airline Website, OTA & Mobile Voucher Cards
  if (flights.length === 0) {
    flights = extractGraphicalOrPortalSegments(lines, text, defaultBaggage, ticketCarrierHint);
  }

  const mealMatch = text.match(/\b(MOML|AVML|VGML|CHML|BBML|DBML|KSML|HNML)\b/i);
  const mealLabel = mealMatch ? `Halal / Special (${mealMatch[1].toUpperCase()})` : 'Meal';
  if (mealMatch) {
    flights.forEach(f => { f.meals = mealLabel; });
  }

  passengers.forEach((p, idx) => {
    if (tickets[idx]) p.ticketNumber = tickets[idx];
    else if (tickets[0] && idx === 0) p.ticketNumber = tickets[0];
    if (seatsFound[idx]) p.seat = seatsFound[idx];
    if (defaultBaggage) p.baggage = defaultBaggage;
    p.meal = mealLabel;
  });

  return enrichBookingData({
    pnr,
    airlinePnr,
    baggage: defaultBaggage || '30 KG',
    passengers,
    flights,
    fare,
    remarks
  });
}

module.exports = {
  parseGdsOrBookingText,
  tryParseGdsSegmentLine,
  normalizeLineOcr
};
