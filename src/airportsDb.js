// Comprehensive Airlines, Airports, Timezones & Sabre Red 360 Enrichment Database

const AIRLINES = {
  PK: { name: 'PAKISTAN INTERNATIONAL AIRLINES', short: 'PIA', prefix: '214' },
  PA: { name: 'AIRBLUE', short: 'Airblue', prefix: '611' },
  ER: { name: 'SERENE AIR', short: 'SereneAir', prefix: '099' },
  PF: { name: 'AIRSIAL', short: 'AirSial', prefix: '095' },
  '9P': { name: 'FLY JINNAH', short: 'Fly Jinnah', prefix: '514' },
  EK: { name: 'EMIRATES', short: 'Emirates', prefix: '176' },
  QR: { name: 'QATAR AIRWAYS', short: 'Qatar Airways', prefix: '157' },
  SV: { name: 'SAUDIA (SAUDI ARABIAN AIRLINES)', short: 'Saudia', prefix: '065' },
  EY: { name: 'ETIHAD AIRWAYS', short: 'Etihad', prefix: '607' },
  FZ: { name: 'FLYDUBAI', short: 'flydubai', prefix: '141' },
  G9: { name: 'AIR ARABIA', short: 'Air Arabia', prefix: '514' },
  XY: { name: 'FLYNAS', short: 'flynas', prefix: '593' },
  F3: { name: 'FLYADEAL', short: 'flyadeal', prefix: '065' },
  TK: { name: 'TURKISH AIRLINES', short: 'Turkish Airlines', prefix: '235' },
  PC: { name: 'PEGASUS AIRLINES', short: 'Pegasus', prefix: '624' },
  GF: { name: 'GULF AIR', short: 'Gulf Air', prefix: '072' },
  WY: { name: 'OMAN AIR', short: 'Oman Air', prefix: '910' },
  OV: { name: 'SALAMAIR', short: 'SalamAir', prefix: '960' },
  KU: { name: 'KUWAIT AIRWAYS', short: 'Kuwait Airways', prefix: '229' },
  J9: { name: 'JAZEERA AIRWAYS', short: 'Jazeera Airways', prefix: '486' },
  RJ: { name: 'ROYAL JORDANIAN', short: 'Royal Jordanian', prefix: '512' },
  MS: { name: 'EGYPTAIR', short: 'EgyptAir', prefix: '077' },
  ME: { name: 'MIDDLE EAST AIRLINES', short: 'MEA', prefix: '076' },
  BA: { name: 'BRITISH AIRWAYS', short: 'British Airways', prefix: '125' },
  VS: { name: 'VIRGIN ATLANTIC', short: 'Virgin Atlantic', prefix: '932' },
  LH: { name: 'LUFTHANSA', short: 'Lufthansa', prefix: '220' },
  LX: { name: 'SWISS INTERNATIONAL AIR LINES', short: 'SWISS', prefix: '724' },
  OS: { name: 'AUSTRIAN AIRLINES', short: 'Austrian', prefix: '257' },
  AF: { name: 'AIR FRANCE', short: 'Air France', prefix: '057' },
  KL: { name: 'KLM ROYAL DUTCH AIRLINES', short: 'KLM', prefix: '074' },
  AZ: { name: 'ITA AIRWAYS', short: 'ITA Airways', prefix: '055' },
  IB: { name: 'IBERIA', short: 'Iberia', prefix: '075' },
  AY: { name: 'FINNAIR', short: 'Finnair', prefix: '105' },
  SK: { name: 'SCANDINAVIAN AIRLINES', short: 'SAS', prefix: '117' },
  LO: { name: 'LOT POLISH AIRLINES', short: 'LOT', prefix: '080' },
  SU: { name: 'AEROFLOT', short: 'Aeroflot', prefix: '555' },
  J2: { name: 'AZERBAIJAN AIRLINES', short: 'AZAL', prefix: '771' },
  HY: { name: 'UZBEKISTAN AIRWAYS', short: 'Uzbekistan Airways', prefix: '250' },
  KC: { name: 'AIR ASTANA', short: 'Air Astana', prefix: '465' },
  UL: { name: 'SRILANKAN AIRLINES', short: 'SriLankan', prefix: '603' },
  TG: { name: 'THAI AIRWAYS INTERNATIONAL', short: 'Thai Airways', prefix: '217' },
  SQ: { name: 'SINGAPORE AIRLINES', short: 'Singapore Airlines', prefix: '618' },
  MH: { name: 'MALAYSIA AIRLINES', short: 'Malaysia Airlines', prefix: '232' },
  OD: { name: 'BATIK AIR MALAYSIA', short: 'Batik Air', prefix: '816' },
  AK: { name: 'AIRASIA', short: 'AirAsia', prefix: '807' },
  CX: { name: 'CATHAY PACIFIC', short: 'Cathay Pacific', prefix: '160' },
  CZ: { name: 'CHINA SOUTHERN AIRLINES', short: 'China Southern', prefix: '784' },
  CA: { name: 'AIR CHINA', short: 'Air China', prefix: '999' },
  MU: { name: 'CHINA EASTERN AIRLINES', short: 'China Eastern', prefix: '781' },
  JL: { name: 'JAPAN AIRLINES', short: 'JAL', prefix: '131' },
  NH: { name: 'ALL NIPPON AIRWAYS', short: 'ANA', prefix: '205' },
  KE: { name: 'KOREAN AIR', short: 'Korean Air', prefix: '180' },
  OZ: { name: 'ASIANA AIRLINES', short: 'Asiana', prefix: '988' },
  PR: { name: 'PHILIPPINE AIRLINES', short: 'Philippine Airlines', prefix: '079' },
  GA: { name: 'GARUDA INDONESIA', short: 'Garuda', prefix: '126' },
  VN: { name: 'VIETNAM AIRLINES', short: 'Vietnam Airlines', prefix: '738' },
  AI: { name: 'AIR INDIA', short: 'Air India', prefix: '098' },
  '6E': { name: 'INDIGO', short: 'IndiGo', prefix: '312' },
  BG: { name: 'BIMAN BANGLADESH AIRLINES', short: 'Biman', prefix: '997' },
  BS: { name: 'US-BANGLA AIRLINES', short: 'US-Bangla', prefix: '779' },
  RA: { name: 'NEPAL AIRLINES', short: 'Nepal Airlines', prefix: '285' },
  AA: { name: 'AMERICAN AIRLINES', short: 'American Airlines', prefix: '001' },
  UA: { name: 'UNITED AIRLINES', short: 'United', prefix: '016' },
  DL: { name: 'DELTA AIR LINES', short: 'Delta', prefix: '006' },
  B6: { name: 'JETBLUE AIRWAYS', short: 'JetBlue', prefix: '279' },
  AS: { name: 'ALASKA AIRLINES', short: 'Alaska Airlines', prefix: '027' },
  AC: { name: 'AIR CANADA', short: 'Air Canada', prefix: '014' },
  WS: { name: 'WESTJET', short: 'WestJet', prefix: '838' },
  QF: { name: 'QANTAS AIRWAYS', short: 'Qantas', prefix: '081' },
  NZ: { name: 'AIR NEW ZEALAND', short: 'Air New Zealand', prefix: '086' },
  ET: { name: 'ETHIOPIAN AIRLINES', short: 'Ethiopian', prefix: '071' },
  KQ: { name: 'KENYA AIRWAYS', short: 'Kenya Airways', prefix: '706' },
  AT: { name: 'ROYAL AIR MAROC', short: 'Royal Air Maroc', prefix: '147' },
  IR: { name: 'IRAN AIR', short: 'Iran Air', prefix: '096' },
  W5: { name: 'MAHAN AIR', short: 'Mahan Air', prefix: '537' },
  IA: { name: 'IRAQI AIRWAYS', short: 'Iraqi Airways', prefix: '073' },
  FG: { name: 'ARIANA AFGHAN AIRLINES', short: 'Ariana', prefix: '255' },
  RQ: { name: 'KAM AIR', short: 'Kam Air', prefix: '384' },
  '8D': { name: 'FITSAIR', short: 'FitsAir', prefix: '088' },
  '3L': { name: 'AIR ARABIA ABU DHABI', short: 'Air Arabia AUH', prefix: '514' },
  '5W': { name: 'WIZZ AIR ABU DHABI', short: 'Wizz Air', prefix: '000' },
  W6: { name: 'WIZZ AIR', short: 'Wizz Air', prefix: '000' },
  SM: { name: 'AIR CAIRO', short: 'Air Cairo', prefix: '859' },
  NP: { name: 'NILE AIR', short: 'Nile Air', prefix: '325' },
  NE: { name: 'NESMA AIRLINES', short: 'Nesma', prefix: '477' },
  TR: { name: 'SCOOT', short: 'Scoot', prefix: '668' },
  SZ: { name: 'SOMON AIR', short: 'Somon Air', prefix: '413' },
  DV: { name: 'SCAT AIRLINES', short: 'SCAT', prefix: '655' },
  QB: { name: 'QESHM AIR', short: 'Qeshm Air', prefix: '000' }
};

// Ticket prefix -> Airline IATA mapping for OCR auto-correction
const PREFIX_TO_AIRLINE = {};
for (const [code, info] of Object.entries(AIRLINES)) {
  if (info.prefix && !PREFIX_TO_AIRLINE[info.prefix]) {
    PREFIX_TO_AIRLINE[info.prefix] = code;
  }
}

const COUNTRY_TZ = {
  PK: 5,
  AE: 4,
  OM: 4,
  SA: 3,
  QA: 3,
  BH: 3,
  KW: 3,
  IQ: 3,
  JO: 3,
  TR: 3,
  EG: 2,
  LB: 2,
  IR: 3.5,
  AF: 4.5,
  AZ: 4,
  UZ: 5,
  KZ: 5,
  IN: 5.5,
  LK: 5.5,
  NP: 5.75,
  BD: 6,
  MV: 5,
  TH: 7,
  VN: 7,
  ID: 7,
  MY: 8,
  SG: 8,
  PH: 8,
  HK: 8,
  CN: 8,
  KR: 9,
  JP: 9,
  AU: 10,
  NZ: 12,
  GB: 0,
  IE: 0,
  PT: 0,
  FR: 1,
  DE: 1,
  NL: 1,
  BE: 1,
  CH: 1,
  AT: 1,
  IT: 1,
  ES: 1,
  DK: 1,
  SE: 1,
  NO: 1,
  PL: 1,
  GR: 2,
  RU: 3,
  ET: 3,
  KE: 3,
  ZA: 2,
  MA: 1,
  US: -5,
  CA: -5
};

const AIRPORTS = {
  // Pakistan
  KHI: { city: 'KARACHI', country: 'PK', name: 'JINNAH INTL AIRPORT' },
  LHE: { city: 'LAHORE', country: 'PK', name: 'ALLAMA IQBAL INTL AIRPORT' },
  ISB: { city: 'ISLAMABAD', country: 'PK', name: 'ISLAMABAD INTL AIRPORT' },
  PEW: { city: 'PESHAWAR', country: 'PK', name: 'BACHA KHAN INTL AIRPORT' },
  MUX: { city: 'MULTAN', country: 'PK', name: 'MULTAN INTL AIRPORT' },
  SKT: { city: 'SIALKOT', country: 'PK', name: 'SIALKOT INTL AIRPORT' },
  LYP: { city: 'FAISALABAD', country: 'PK', name: 'FAISALABAD INTL AIRPORT' },
  UET: { city: 'QUETTA', country: 'PK', name: 'QUETTA INTL AIRPORT' },
  GWD: { city: 'GWADAR', country: 'PK', name: 'NEW GWADAR INTL AIRPORT' },
  SKZ: { city: 'SUKKUR', country: 'PK', name: 'BEGUM NUSRAT BHUTTO AIRPORT' },
  RYK: { city: 'RAHIM YAR KHAN', country: 'PK', name: 'SHAIKH ZAYED INTL AIRPORT' },
  BHV: { city: 'BAHAWALPUR', country: 'PK', name: 'BAHAWALPUR AIRPORT' },
  TUK: { city: 'TURBAT', country: 'PK', name: 'TURBAT INTL AIRPORT' },
  GIL: { city: 'GILGIT', country: 'PK', name: 'GILGIT AIRPORT' },
  KDU: { city: 'SKARDU', country: 'PK', name: 'SKARDU INTL AIRPORT' },
  CJL: { city: 'CHITRAL', country: 'PK', name: 'CHITRAL AIRPORT' },
  DEA: { city: 'DERA GHAZI KHAN', country: 'PK', name: 'DERA GHAZI KHAN AIRPORT' },

  // UAE
  DXB: { city: 'DUBAI', country: 'AE', name: 'DUBAI INTL AIRPORT' },
  DWC: { city: 'DUBAI', country: 'AE', name: 'AL MAKTOUM INTL AIRPORT' },
  AUH: { city: 'ABU DHABI', country: 'AE', name: 'ZAYED INTL AIRPORT' },
  SHJ: { city: 'SHARJAH', country: 'AE', name: 'SHARJAH INTL AIRPORT' },
  RKT: { city: 'RAS AL KHAIMAH', country: 'AE', name: 'RAS AL KHAIMAH INTL AIRPORT' },
  AAN: { city: 'AL AIN', country: 'AE', name: 'AL AIN INTL AIRPORT' },

  // Saudi Arabia (All Domestic & International Hubs)
  JED: { city: 'JEDDAH', country: 'SA', name: 'KING ABDULAZIZ INTL AIRPORT' },
  RUH: { city: 'RIYADH', country: 'SA', name: 'KING KHALID INTL AIRPORT' },
  MED: { city: 'MADINAH', country: 'SA', name: 'PRINCE MOHAMMAD BIN ABDULAZIZ INTL' },
  DMM: { city: 'DAMMAM', country: 'SA', name: 'KING FAHD INTL AIRPORT' },
  ELQ: { city: 'GASSIM', country: 'SA', name: 'PRINCE NAIF BIN ABDULAZIZ AIRPORT' },
  AHB: { city: 'ABHA', country: 'SA', name: 'ABHA INTL AIRPORT' },
  TIF: { city: 'TAIF', country: 'SA', name: 'TAIF INTL AIRPORT' },
  TUU: { city: 'TABUK', country: 'SA', name: 'PRINCE SULTAN BIN ABDULAZIZ AIRPORT' },
  YNB: { city: 'YANBU', country: 'SA', name: 'PRINCE ABDUL MOHSIN BIN ABDULAZIZ' },
  GIZ: { city: 'JAZAN', country: 'SA', name: 'KING ABDULLAH BIN ABDULAZIZ AIRPORT' },
  HAS: { city: 'HAIL', country: 'SA', name: 'HAIL REGIONAL AIRPORT' },
  AJF: { city: 'AL JOUF', country: 'SA', name: 'AL JOUF AIRPORT' },
  ULH: { city: 'AL ULA', country: 'SA', name: 'PRINCE ABDULMAJEED BIN ABDULAZIZ' },
  HOF: { city: 'AL AHSA', country: 'SA', name: 'AL AHSA INTL AIRPORT' },
  EAM: { city: 'NAJRAN', country: 'SA', name: 'NAJRAN AIRPORT' },
  BHH: { city: 'BISHA', country: 'SA', name: 'BISHA AIRPORT' },
  URY: { city: 'GURIAT', country: 'SA', name: 'GURIAT DOMESTIC AIRPORT' },
  RAE: { city: 'ARAR', country: 'SA', name: 'ARAR AIRPORT' },
  RSI: { city: 'RED SEA', country: 'SA', name: 'RED SEA INTL AIRPORT' },
  NUM: { city: 'NEOM', country: 'SA', name: 'NEOM BAY AIRPORT' },

  // GCC & Middle East
  DOH: { city: 'DOHA', country: 'QA', name: 'HAMAD INTL AIRPORT' },
  MCT: { city: 'MUSCAT', country: 'OM', name: 'MUSCAT INTL AIRPORT' },
  SLL: { city: 'SALALAH', country: 'OM', name: 'SALALAH INTL AIRPORT' },
  BAH: { city: 'MANAMA', country: 'BH', name: 'BAHRAIN INTL AIRPORT' },
  KWI: { city: 'KUWAIT CITY', country: 'KW', name: 'KUWAIT INTL AIRPORT' },
  AMM: { city: 'AMMAN', country: 'JO', name: 'QUEEN ALIA INTL AIRPORT' },
  CAI: { city: 'CAIRO', country: 'EG', name: 'CAIRO INTL AIRPORT' },
  BEY: { city: 'BEIRUT', country: 'LB', name: 'RAFIC HARIRI INTL AIRPORT' },
  BGW: { city: 'BAGHDAD', country: 'IQ', name: 'BAGHDAD INTL AIRPORT' },
  NJF: { city: 'NAJAF', country: 'IQ', name: 'AL NAJAF INTL AIRPORT' },
  IKA: { city: 'TEHRAN', country: 'IR', name: 'IMAM KHOMEINI INTL AIRPORT' },
  MHD: { city: 'MASHHAD', country: 'IR', name: 'MASHHAD INTL AIRPORT' },
  IST: { city: 'ISTANBUL', country: 'TR', name: 'ISTANBUL AIRPORT' },
  SAW: { city: 'ISTANBUL', country: 'TR', name: 'SABIHA GOKCEN INTL AIRPORT' },
  ESB: { city: 'ANKARA', country: 'TR', name: 'ESENBOGA AIRPORT' },
  AYT: { city: 'ANTALYA', country: 'TR', name: 'ANTALYA AIRPORT' },
  GYD: { city: 'BAKU', country: 'AZ', name: 'HEYDAR ALIYEV INTL AIRPORT' },
  TAS: { city: 'TASHKENT', country: 'UZ', name: 'ISLAM KARIMOV INTL AIRPORT' },
  ALA: { city: 'ALMATY', country: 'KZ', name: 'ALMATY INTL AIRPORT' },

  // UK & Europe
  LHR: { city: 'LONDON', country: 'GB', name: 'HEATHROW AIRPORT' },
  LGW: { city: 'LONDON', country: 'GB', name: 'GATWICK AIRPORT' },
  STN: { city: 'LONDON', country: 'GB', name: 'STANSTED AIRPORT' },
  LTN: { city: 'LONDON', country: 'GB', name: 'LUTON AIRPORT' },
  MAN: { city: 'MANCHESTER', country: 'GB', name: 'MANCHESTER AIRPORT' },
  BHX: { city: 'BIRMINGHAM', country: 'GB', name: 'BIRMINGHAM AIRPORT' },
  GLA: { city: 'GLASGOW', country: 'GB', name: 'GLASGOW INTL AIRPORT' },
  EDI: { city: 'EDINBURGH', country: 'GB', name: 'EDINBURGH AIRPORT' },
  CDG: { city: 'PARIS', country: 'FR', name: 'CHARLES DE GAULLE AIRPORT' },
  ORY: { city: 'PARIS', country: 'FR', name: 'ORLY AIRPORT' },
  FRA: { city: 'FRANKFURT', country: 'DE', name: 'FRANKFURT INTL AIRPORT' },
  MUC: { city: 'MUNICH', country: 'DE', name: 'MUNICH INTL AIRPORT' },
  BER: { city: 'BERLIN', country: 'DE', name: 'BRANDENBURG AIRPORT' },
  AMS: { city: 'AMSTERDAM', country: 'NL', name: 'SCHIPHOL AIRPORT' },
  BRU: { city: 'BRUSSELS', country: 'BE', name: 'BRUSSELS AIRPORT' },
  ZRH: { city: 'ZURICH', country: 'CH', name: 'ZURICH AIRPORT' },
  GVA: { city: 'GENEVA', country: 'CH', name: 'GENEVA AIRPORT' },
  VIE: { city: 'VIENNA', country: 'AT', name: 'VIENNA INTL AIRPORT' },
  MXP: { city: 'MILAN', country: 'IT', name: 'MALPENSA AIRPORT' },
  FCO: { city: 'ROME', country: 'IT', name: 'FIUMICINO AIRPORT' },
  MAD: { city: 'MADRID', country: 'ES', name: 'ADOLFO SUAREZ BARAJAS AIRPORT' },
  BCN: { city: 'BARCELONA', country: 'ES', name: 'EL PRAT AIRPORT' },
  LIS: { city: 'LISBON', country: 'PT', name: 'HUMBERTO DELGADO AIRPORT' },
  ATH: { city: 'ATHENS', country: 'GR', name: 'ELEFTHERIOS VENIZELOS AIRPORT' },
  DUB: { city: 'DUBLIN', country: 'IE', name: 'DUBLIN AIRPORT' },
  CPH: { city: 'COPENHAGEN', country: 'DK', name: 'KASTRUP AIRPORT' },
  ARN: { city: 'STOCKHOLM', country: 'SE', name: 'ARLANDA AIRPORT' },
  OSL: { city: 'OSLO', country: 'NO', name: 'GARDERMOEN AIRPORT' },
  WAW: { city: 'WARSAW', country: 'PL', name: 'CHOPIN AIRPORT' },
  SVO: { city: 'MOSCOW', country: 'RU', name: 'SHEREMETYEVO INTL AIRPORT' },

  // North America
  JFK: { city: 'NEW YORK', country: 'US', name: 'JOHN F KENNEDY INTL AIRPORT' },
  EWR: { city: 'NEWARK', country: 'US', name: 'NEWARK LIBERTY INTL AIRPORT' },
  LGA: { city: 'NEW YORK', country: 'US', name: 'LAGUARDIA AIRPORT' },
  IAD: { city: 'WASHINGTON', country: 'US', name: 'DULLES INTL AIRPORT' },
  ORD: { city: 'CHICAGO', country: 'US', name: 'O HARE INTL AIRPORT' },
  LAX: { city: 'LOS ANGELES', country: 'US', name: 'LOS ANGELES INTL AIRPORT', tz: -8 },
  SFO: { city: 'SAN FRANCISCO', country: 'US', name: 'SAN FRANCISCO INTL AIRPORT', tz: -8 },
  IAH: { city: 'HOUSTON', country: 'US', name: 'GEORGE BUSH INTERCONTINENTAL', tz: -6 },
  DFW: { city: 'DALLAS', country: 'US', name: 'DALLAS FORT WORTH INTL', tz: -6 },
  ATL: { city: 'ATLANTA', country: 'US', name: 'HARTSFIELD JACKSON INTL' },
  MIA: { city: 'MIAMI', country: 'US', name: 'MIAMI INTL AIRPORT' },
  BOS: { city: 'BOSTON', country: 'US', name: 'LOGAN INTL AIRPORT' },
  SEA: { city: 'SEATTLE', country: 'US', name: 'SEATTLE TACOMA INTL AIRPORT', tz: -8 },
  YYZ: { city: 'TORONTO', country: 'CA', name: 'PEARSON INTL AIRPORT' },
  YVR: { city: 'VANCOUVER', country: 'CA', name: 'VANCOUVER INTL AIRPORT', tz: -8 },
  YUL: { city: 'MONTREAL', country: 'CA', name: 'PIERRE ELLIOTT TRUDEAU INTL' },
  YYC: { city: 'CALGARY', country: 'CA', name: 'CALGARY INTL AIRPORT', tz: -7 },

  // Asia & Oceania & Africa
  KUL: { city: 'KUALA LUMPUR', country: 'MY', name: 'KUALA LUMPUR INTL AIRPORT' },
  SIN: { city: 'SINGAPORE', country: 'SG', name: 'CHANGI INTL AIRPORT' },
  BKK: { city: 'BANGKOK', country: 'TH', name: 'SUVARNABHUMI AIRPORT' },
  DMK: { city: 'BANGKOK', country: 'TH', name: 'DON MUEANG INTL AIRPORT' },
  HKT: { city: 'PHUKET', country: 'TH', name: 'PHUKET INTL AIRPORT' },
  CGK: { city: 'JAKARTA', country: 'ID', name: 'SOEKARNO HATTA INTL AIRPORT' },
  DPS: { city: 'BALI', country: 'ID', name: 'NGURAH RAI INTL AIRPORT', tz: 8 },
  MNL: { city: 'MANILA', country: 'PH', name: 'NINOY AQUINO INTL AIRPORT' },
  CMB: { city: 'COLOMBO', country: 'LK', name: 'BANDARANAIKE INTL AIRPORT' },
  MLE: { city: 'MALE', country: 'MV', name: 'VELANA INTL AIRPORT' },
  DAC: { city: 'DHAKA', country: 'BD', name: 'HAZRAT SHAHJALAL INTL AIRPORT' },
  KTM: { city: 'KATHMANDU', country: 'NP', name: 'TRIBHUVAN INTL AIRPORT' },
  DEL: { city: 'NEW DELHI', country: 'IN', name: 'INDIRA GANDHI INTL AIRPORT' },
  BOM: { city: 'MUMBAI', country: 'IN', name: 'CHHATRAPATI SHIVAJI INTL' },
  HKG: { city: 'HONG KONG', country: 'HK', name: 'HONG KONG INTL AIRPORT' },
  CAN: { city: 'GUANGZHOU', country: 'CN', name: 'BAIYUN INTL AIRPORT' },
  PEK: { city: 'BEIJING', country: 'CN', name: 'CAPITAL INTL AIRPORT' },
  PKX: { city: 'BEIJING', country: 'CN', name: 'DAXING INTL AIRPORT' },
  PVG: { city: 'SHANGHAI', country: 'CN', name: 'PUDONG INTL AIRPORT' },
  URC: { city: 'URUMQI', country: 'CN', name: 'DIWOPU INTL AIRPORT' },
  ICN: { city: 'SEOUL', country: 'KR', name: 'INCHEON INTL AIRPORT' },
  NRT: { city: 'TOKYO', country: 'JP', name: 'NARITA INTL AIRPORT' },
  HND: { city: 'TOKYO', country: 'JP', name: 'HANEDA AIRPORT' },
  SYD: { city: 'SYDNEY', country: 'AU', name: 'KINGSFORD SMITH AIRPORT' },
  MEL: { city: 'MELBOURNE', country: 'AU', name: 'MELBOURNE AIRPORT' },
  PER: { city: 'PERTH', country: 'AU', name: 'PERTH AIRPORT', tz: 8 },
  AKL: { city: 'AUCKLAND', country: 'NZ', name: 'AUCKLAND INTL AIRPORT' },
  JNB: { city: 'JOHANNESBURG', country: 'ZA', name: 'O R TAMBO INTL AIRPORT' },
  CPT: { city: 'CAPE TOWN', country: 'ZA', name: 'CAPE TOWN INTL AIRPORT' },
  NBO: { city: 'NAIROBI', country: 'KE', name: 'JOMO KENYATTA INTL AIRPORT' },
  ADD: { city: 'ADDIS ABABA', country: 'ET', name: 'BOLE INTL AIRPORT' },
  KBL: { city: 'KABUL', country: 'AF', name: 'KABUL INTL AIRPORT' }
};

function computeFlightDuration(fromCode, toCode, depTime24, arrTime24, depDateStr, arrDateStr) {
  if (!depTime24 || !arrTime24) return '';
  const dm = depTime24.match(/^(\d{2}):(\d{2})$/);
  const am = arrTime24.match(/^(\d{2}):(\d{2})$/);
  if (!dm || !am) return '';

  const depMinsLocal = parseInt(dm[1], 10) * 60 + parseInt(dm[2], 10);
  const arrMinsLocal = parseInt(am[1], 10) * 60 + parseInt(am[2], 10);

  const fromInfo = AIRPORTS[fromCode];
  const toInfo = AIRPORTS[toCode];
  const fromTz = fromInfo ? (fromInfo.tz ?? COUNTRY_TZ[fromInfo.country] ?? 0) : 0;
  const toTz = toInfo ? (toInfo.tz ?? COUNTRY_TZ[toInfo.country] ?? 0) : 0;

  let dayDiff = 0;
  if (depDateStr && arrDateStr && depDateStr !== arrDateStr) {
    dayDiff = 1;
  }

  let diffMins = (arrMinsLocal + dayDiff * 1440 - toTz * 60) - (depMinsLocal - fromTz * 60);
  if (diffMins <= 0) diffMins += 1440;
  if (diffMins > 1440 && dayDiff === 1) diffMins -= 1440;

  if (diffMins <= 15 || diffMins > 1380) return '';
  const hrs = Math.floor(diffMins / 60);
  const mins = Math.round(diffMins % 60);
  return `${hrs}hr(s) ${String(mins).padStart(2, '0')}min(s)`;
}

function getCabinFromBookingClass(code) {
  if (!code) return 'Economy';
  const c = String(code).trim().toUpperCase();
  if (c.length > 2) {
    if (/FIRST/i.test(c)) return 'First Class';
    if (/BUS/i.test(c)) return 'Business';
    if (/PREM/i.test(c)) return 'Premium Economy';
    return 'Economy';
  }
  const ch = c[0];
  if (['F', 'A'].includes(ch)) return 'First Class';
  if (['J', 'C', 'D', 'I', 'Z'].includes(ch)) return 'Business';
  if (['W', 'P'].includes(ch)) return 'Premium Economy';
  return 'Economy';
}

function normalizeStatus(statusRaw) {
  if (!statusRaw) return 'Confirmed';
  const s = String(statusRaw).trim().toUpperCase();
  if (/^(HK|KK|TK|OK|SS|GK|CONF|TICKET)/i.test(s)) return 'Confirmed';
  if (/^(HL|WL|UU|US|WAIT)/i.test(s)) return 'Waitlisted';
  if (/^(HX|UN|UC|NO|XX|CANC)/i.test(s)) return 'Cancelled';
  if (/^(NN|PN|RQ|HOLD|PEND)/i.test(s)) return 'On Hold';
  return statusRaw;
}

function formatSabreDate(dateStr) {
  if (!dateStr) return '';
  let raw = String(dateStr).trim().toUpperCase();
  // Normalize OCR glitches at start of date e.g. I8NOV -> 18NOV, O5DEC -> 05DEC, l2JAN -> 12JAN, 22N0V -> 22NOV
  raw = raw
    .replace(/\b([IOl])(\d)\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/g, (_, a, b, m) => `${a === 'O' ? '0' : '1'}${b}${m}`)
    .replace(/\b(\d)([IOl])\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/g, (_, a, b, m) => `${a}${b === 'O' ? '0' : '1'}${m}`)
    .replace(/N0V/g, 'NOV')
    .replace(/0CT/g, 'OCT');

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  let parsed = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    parsed = new Date(Date.UTC(y, m - 1, d));
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(raw)) {
    // DD/MM/YYYY or DD-MM-YYYY (standard in Pakistan/UK/GDS portals)
    const [d, m, yRaw] = raw.split(/[/-]/).map(Number);
    const y = yRaw < 100 ? 2000 + yRaw : yRaw;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      parsed = new Date(Date.UTC(y, m - 1, d));
    }
  } else {
    // 18NOV, 18 NOV 2026, 18-NOV-26
    const gdsMatch = raw.match(/(\d{1,2})[\s-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s,-]*(\d{2,4})?/);
    // NOV 18, 2026 or Wed, Nov 18 2026
    const mdyMatch = !gdsMatch && raw.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s.-]+(\d{1,2})(?:ST|ND|RD|TH)?[\s,.-]*(\d{2,4})?/);
    if (gdsMatch) {
      const day = parseInt(gdsMatch[1], 10);
      const monIdx = months.indexOf(gdsMatch[2]);
      let year = gdsMatch[3] ? parseInt(gdsMatch[3], 10) : new Date().getUTCFullYear();
      if (year < 100) year += 2000;
      parsed = new Date(Date.UTC(year, monIdx, day));
    } else if (mdyMatch) {
      const monIdx = months.indexOf(mdyMatch[1]);
      const day = parseInt(mdyMatch[2], 10);
      let year = mdyMatch[3] ? parseInt(mdyMatch[3], 10) : new Date().getUTCFullYear();
      if (year < 100) year += 2000;
      parsed = new Date(Date.UTC(year, monIdx, day));
    } else {
      const tryDate = new Date(raw);
      if (!isNaN(tryDate.getTime())) {
        parsed = new Date(Date.UTC(tryDate.getFullYear(), tryDate.getMonth(), tryDate.getDate()));
      }
    }
  }

  if (parsed && !isNaN(parsed.getTime())) {
    const dow = days[parsed.getUTCDay()];
    const dd = String(parsed.getUTCDate()).padStart(2, '0');
    const mon = months[parsed.getUTCMonth()];
    const yyyy = parsed.getUTCFullYear();
    return `${dow} ${dd} ${mon} ${yyyy}`;
  }
  return raw;
}

function formatTime24(timeStr) {
  if (!timeStr) return '';
  let t = String(timeStr)
    .trim()
    .toUpperCase()
    .replace(/^[#*+]+/, '')
    .replace(/[+#-]\d+$/, '')
    .replace(/\s*HRS?$/i, '')
    .replace(/\./g, ':')
    .trim();

  // Fix OCR O->0 and I/l->1 in numeric time parts before A/P/N/M
  const suffixMatch = t.match(/^([0-9OIl:]{3,5})\s*(AM|PM|A|P|N|M)?$/);
  if (suffixMatch) {
    const numPart = suffixMatch[1].replace(/O/g, '0').replace(/[Il]/g, '1');
    const suf = suffixMatch[2] || '';
    t = `${numPart}${suf}`;
  }

  const ampmMatch = t.match(/^(\d{1,2}):?(\d{2})\s*(AM|PM|A|P|N|M)$/);
  if (ampmMatch) {
    let hh = parseInt(ampmMatch[1], 10);
    const mm = ampmMatch[2];
    const ap = ampmMatch[3];
    if (ap === 'N') {
      hh = 12; // Sabre 1200N = Noon
    } else if (ap === 'M') {
      hh = 0; // Sabre 1200M = Midnight
    } else if ((ap === 'PM' || ap === 'P') && hh < 12) {
      hh += 12;
    } else if ((ap === 'AM' || ap === 'A') && hh === 12) {
      hh = 0;
    }
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }
  const fourDigit = t.match(/^(\d{2}):?(\d{2})$/);
  if (fourDigit) return `${fourDigit[1]}:${fourDigit[2]}`;
  const threeDigit = t.match(/^(\d{1}):?(\d{2})$/);
  if (threeDigit) return `0${threeDigit[1]}:${threeDigit[2]}`;
  return t;
}

function formatSabrePassengerName(nameRaw) {
  if (!nameRaw) return 'PASSENGER/GUEST MR';
  const clean = String(nameRaw)
    .trim()
    .toUpperCase()
    .replace(/^\d+(\.\d+)?\s*/, '')
    .replace(/\s+/g, ' ');
  if (clean.includes('/')) return clean;
  const titles = ['MR', 'MRS', 'MS', 'MISS', 'MSTR', 'DR', 'PROF', 'INF', 'CHD'];
  const tokens = clean.split(/\s+/).filter(Boolean);
  let title = '';
  if (tokens.length > 1 && titles.includes(tokens[0].replace(/\./g, ''))) {
    title = tokens.shift().replace(/\./g, '');
  } else if (tokens.length > 1 && titles.includes(tokens[tokens.length - 1].replace(/\./g, ''))) {
    title = tokens.pop().replace(/\./g, '');
  }
  if (tokens.length >= 2) {
    const surname = tokens.pop();
    const given = tokens.join(' ');
    return `${surname}/${given}${title ? ' ' + title : ''}`;
  }
  return clean;
}

function enrichBookingData(data = {}) {
  const todayStr = formatSabreDate(new Date().toISOString().slice(0, 10));
  const out = {
    pnr: String(data.pnr || data.reservationCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'SBR360',
    airlinePnr: String(data.airlinePnr || data.airlineReservationCode || '').trim().toUpperCase() || '',
    issueDate: formatSabreDate(data.issueDate) || todayStr,
    status: normalizeStatus(data.status || 'Confirmed'),
    passengers: [],
    flights: [],
    fare: {
      showFare: Boolean(data.fare?.showFare),
      currency: String(data.fare?.currency || 'PKR').toUpperCase(),
      baseFare: String(data.fare?.baseFare || ''),
      taxes: String(data.fare?.taxes || ''),
      totalFare: String(data.fare?.totalFare || ''),
      paymentMethod: String(data.fare?.paymentMethod || 'CASH / INVOICE').toUpperCase()
    },
    remarks: Array.isArray(data.remarks)
      ? data.remarks.filter(Boolean)
      : data.remarks
        ? [String(data.remarks)]
        : []
  };

  const defaultBag = data.baggage || data.defaultBaggage || '30 KG';

  const rawPassengers = Array.isArray(data.passengers) && data.passengers.length > 0
    ? data.passengers
    : [{ name: 'PASSENGER/TRAVELER MR', type: 'ADT' }];

  out.passengers = rawPassengers.map((p, idx) => {
    const paxObj = typeof p === 'string' ? { name: p } : (p || {});
    const formattedName = formatSabrePassengerName(paxObj.name);
    let type = String(paxObj.type || 'ADT').toUpperCase();
    if (!['ADT', 'CNN', 'CHD', 'INF'].includes(type)) {
      if (/\b(MSTR|MISS)\b/.test(formattedName) && /CHD|CHILD|CNN/i.test(paxObj.type || '')) type = 'CNN';
      else if (/INF/i.test(paxObj.type || '')) type = 'INF';
      else type = 'ADT';
    }
    return {
      id: idx + 1,
      name: formattedName,
      type,
      ticketNumber: String(paxObj.ticketNumber || paxObj.eticket || '').trim(),
      seat: String(paxObj.seat || 'Check-In Required').trim(),
      baggage: String(paxObj.baggage || defaultBag).trim(),
      frequentFlyer: String(paxObj.frequentFlyer || '').trim(),
      meal: String(paxObj.meal || 'Meal').trim(),
      passport: String(paxObj.passport || '').trim()
    };
  });

  // Check ticket prefix hint for OCR carrier validation
  const firstTktPrefix = out.passengers[0]?.ticketNumber?.slice(0, 3) || '';
  const ticketCarrierHint = PREFIX_TO_AIRLINE[firstTktPrefix] || '';

  const rawFlights = Array.isArray(data.flights) ? data.flights : [];
  out.flights = rawFlights.map((f, idx) => {
    let airlineCode = String(f.airlineCode || '').trim().toUpperCase();
    let flightNo = String(f.flightNumber || f.flightNo || '').trim().toUpperCase();

    const fnMatch = flightNo.match(/^([A-Z0-9]{2})\s*(\d{1,4}[A-Z]?)$/);
    if (fnMatch) {
      if (!airlineCode) airlineCode = fnMatch[1];
      // Auto-heal OCR single-letter glitch if carrier unknown but ticket prefix matches closely
      if (!AIRLINES[airlineCode] && ticketCarrierHint && airlineCode[0] === ticketCarrierHint[0]) {
        airlineCode = ticketCarrierHint;
      }
      flightNo = `${airlineCode} ${fnMatch[2]}`;
    } else if (airlineCode && /^\d+$/.test(flightNo)) {
      if (!AIRLINES[airlineCode] && ticketCarrierHint && airlineCode[0] === ticketCarrierHint[0]) {
        airlineCode = ticketCarrierHint;
      }
      flightNo = `${airlineCode} ${flightNo}`;
    }

    const airlineInfo = AIRLINES[airlineCode] || null;
    const airlineName = String(
      (f.airlineName && f.airlineName !== f.airlineCode ? f.airlineName : '') ||
      (airlineInfo ? airlineInfo.name : airlineCode || 'AIRLINE')
    ).toUpperCase();

    const fromCode = String(f.fromCode || f.origin || f.departureAirport || '').trim().toUpperCase().slice(0, 3);
    const toCode = String(f.toCode || f.destination || f.arrivalAirport || '').trim().toUpperCase().slice(0, 3);

    const fromInfo = AIRPORTS[fromCode] || null;
    const toInfo = AIRPORTS[toCode] || null;

    const fromCity = String(f.fromCity || (fromInfo ? `${fromInfo.city}, ${fromInfo.country}` : fromCode)).toUpperCase();
    const fromAirportName = String(f.fromAirportName || (fromInfo ? fromInfo.name : '')).toUpperCase();

    const toCity = String(f.toCity || (toInfo ? `${toInfo.city}, ${toInfo.country}` : toCode)).toUpperCase();
    const toAirportName = String(f.toAirportName || (toInfo ? toInfo.name : '')).toUpperCase();

    const bookingClass = String(f.bookingClass || f.classCode || 'Y').trim().toUpperCase().slice(0, 2);
    const cabin = f.cabin ? getCabinFromBookingClass(f.cabin) : getCabinFromBookingClass(bookingClass);

    const depDate = formatSabreDate(f.departureDate || f.date || '');
    const arrDate = f.arrivalDate ? formatSabreDate(f.arrivalDate) : depDate;
    const depTime = formatTime24(f.departureTime || '');
    const arrTime = formatTime24(f.arrivalTime || '');

    let duration = String(f.duration || '').trim();
    if (!duration || duration === 'Non-Stop') {
      duration = computeFlightDuration(fromCode, toCode, depTime, arrTime, depDate, arrDate) || 'Non-Stop';
    }

    return {
      segmentNumber: idx + 1,
      airlineCode,
      airlineName,
      flightNumber: flightNo || `${airlineCode} 101`.trim(),
      operatedBy: String(f.operatedBy || '').toUpperCase(),
      fromCode: fromCode || '---',
      fromCity,
      fromAirportName,
      fromTerminal: String(f.fromTerminal || f.departureTerminal || 'Not Available').toUpperCase(),
      toCode: toCode || '---',
      toCity,
      toAirportName,
      toTerminal: String(f.toTerminal || f.arrivalTerminal || 'Not Available').toUpperCase(),
      departureDate: depDate || todayStr,
      departureTime: depTime,
      arrivalDate: arrDate || depDate || todayStr,
      arrivalTime: arrTime,
      cabin,
      bookingClass,
      status: normalizeStatus(f.status || 'Confirmed'),
      duration,
      aircraft: String(f.aircraft || 'JET AIRCRAFT').toUpperCase(),
      meals: String(f.meals || 'Meal / Refreshments'),
      stops: String(f.stops ?? 'Non-Stop'),
      baggage: String(f.baggage || out.passengers[0]?.baggage || defaultBag).toUpperCase(),
      airlinePnr: String(f.airlinePnr || out.airlinePnr || out.pnr).toUpperCase()
    };
  });

  if (!out.airlinePnr && out.flights[0]?.airlineCode) {
    out.airlinePnr = `${out.pnr} (${out.flights[0].airlineCode})`;
  }

  return out;
}

module.exports = {
  AIRLINES,
  AIRPORTS,
  PREFIX_TO_AIRLINE,
  computeFlightDuration,
  getCabinFromBookingClass,
  normalizeStatus,
  formatSabreDate,
  formatTime24,
  formatSabrePassengerName,
  enrichBookingData
};
