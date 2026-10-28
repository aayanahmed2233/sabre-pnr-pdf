const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureSampleScreenshots() {
  const samplesDir = path.join(__dirname, '..', 'public', 'samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  // Sample 1: Classic Sabre Red 360 Green-on-Black Terminal (*A Display)
  const sabreTerminalSvg = `
  <svg width="1100" height="560" xmlns="http://www.w3.org/2000/svg">
    <rect width="1100" height="560" fill="#070d14"/>
    <rect width="1100" height="36" fill="#162231"/>
    <text x="20" y="24" font-family="monospace" font-size="16" font-weight="bold" fill="#e2e8f0">SABRE RED 360 - COMMAND WORKSPACE (*A)  |  PCC: 7K4I KARACHI</text>
    <g font-family="monospace" font-size="21" fill="#38ff7a" font-weight="bold">
      <text x="28" y="80">K8M4R9</text>
      <text x="28" y="116">1.1KHAN/MUHAMMAD TARIQ MR   2.1KHAN/SADIA MRS</text>
      <text x="28" y="150">3.1KHAN/HAMZA MSTR*C09</text>
      <text x="28" y="196"> 1 SV 705Y 18NOV 3 KHIJED*HK3  0415  0625  /DCSV*L9P2X4 /E</text>
      <text x="28" y="232"> 2 SV 700V 28NOV 6 JEDKHI*HK3  1910  0050  29NOV /DCSV*L9P2X4 /E</text>
      <text x="28" y="278">TKT/TIME LIMIT</text>
      <text x="28" y="312">  1.T-28OCT-7K4I*ASIM</text>
      <text x="28" y="346">  TE 065-2498102931 KHAN/M T MR</text>
      <text x="28" y="380">  TE 065-2498102932 KHAN/S MRS</text>
      <text x="28" y="414">  TE 065-2498102933 KHAN/H MSTR</text>
      <text x="28" y="456">GENERAL FACTS / BAGGAGE: 2 PC (23KG EACH)  MEAL: MOML</text>
      <text x="28" y="492">PHONES: 1.KHI 92-300-8241920-A SKYLINE TRAVELS KARACHI</text>
    </g>
  </svg>`;

  // Sample 2: Modern Airline / OTA Web Confirmation Screenshot (Emirates Return KHI-DXB-LHR)
  const emiratesWebSvg = `
  <svg width="1100" height="580" xmlns="http://www.w3.org/2000/svg">
    <rect width="1100" height="580" fill="#f8fafc"/>
    <rect width="1100" height="68" fill="#c60c30"/>
    <text x="32" y="43" font-family="Arial, sans-serif" font-size="25" font-weight="bold" fill="#ffffff">EMIRATES  |  Manage Booking Confirmation</text>
    <rect x="30" y="90" width="1040" height="90" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="52" y="125" font-family="Arial, sans-serif" font-size="18" fill="#475569">Booking Reference (PNR): <tspan font-weight="bold" fill="#0f172a">H4W9Q2</tspan>     Airline PNR: <tspan font-weight="bold" fill="#0f172a">EK982L</tspan></text>
    <text x="52" y="158" font-family="Arial, sans-serif" font-size="18" fill="#0f172a" font-weight="bold">Passengers: 1.1 SHAIKH/BILAL AHMED MR   2.1 SHAIKH/ZAINAB MS</text>

    <rect x="30" y="200" width="1040" height="190" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="52" y="236" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#c60c30">OUTBOUND FLIGHT DETAILS - BUSINESS CLASS (J) - CONFIRMED</text>
    <text x="52" y="274" font-family="monospace" font-size="20" font-weight="bold" fill="#0f172a">1 EK 601 J 22NOV 7 KHIDXB HK2 12:45 14:05  /DCEK*EK982L</text>
    <text x="52" y="306" font-family="Arial, sans-serif" font-size="16" fill="#334155">Karachi (KHI) Terminal M  to  Dubai (DXB) Terminal 3  |  Boeing 777-300ER  |  Baggage: 40 KG</text>
    <text x="52" y="344" font-family="monospace" font-size="20" font-weight="bold" fill="#0f172a">2 EK 003 J 22NOV 7 DXBLHR HK2 15:45 19:40  /DCEK*EK982L</text>
    <text x="52" y="374" font-family="Arial, sans-serif" font-size="16" fill="#334155">Dubai (DXB) Terminal 3  to  London Heathrow (LHR) Terminal 3  |  Airbus A380-800  |  Baggage: 40 KG</text>

    <rect x="30" y="410" width="1040" height="135" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="52" y="446" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">E-Ticket Numbers &amp; Fare Summary</text>
    <text x="52" y="480" font-family="Arial, sans-serif" font-size="18" fill="#1e293b">Ticket 1: 176-8392019482 (SHAIKH/BILAL AHMED MR)   |   Seat: 07A</text>
    <text x="52" y="512" font-family="Arial, sans-serif" font-size="18" fill="#1e293b">Ticket 2: 176-8392019483 (SHAIKH/ZAINAB MS)        |   Seat: 07B   |   Total Fare: PKR 685,000</text>
  </svg>`;

  // Sample 3: Domestic Pakistan Portal Screenshot (PIA KHI -> ISB)
  const domesticPortalSvg = `
  <svg width="1050" height="470" xmlns="http://www.w3.org/2000/svg">
    <rect width="1050" height="470" fill="#ffffff"/>
    <rect x="20" y="20" width="1010" height="430" rx="10" fill="#f8fafc" stroke="#15803d" stroke-width="3"/>
    <rect x="20" y="20" width="1010" height="58" rx="8" fill="#14532d"/>
    <text x="45" y="56" font-family="Arial, sans-serif" font-size="23" font-weight="bold" fill="#ffffff">PAKISTAN INTERNATIONAL AIRLINES  -  BOOKING VOUCHER</text>
    <text x="45" y="115" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">PNR: R7N3T5      AIRLINE PNR: PK492M      STATUS: CONFIRMED</text>
    <text x="45" y="158" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#1e293b">1.1 ALI/SYED HASSAN MR</text>
    <text x="45" y="210" font-family="monospace" font-size="21" font-weight="bold" fill="#0f172a">1 PK 302 Y 05DEC 6 KHIISB HK1 07:00 09:00 /DCPK*PK492M</text>
    <text x="45" y="252" font-family="Arial, sans-serif" font-size="18" fill="#334155">Route: Karachi (KHI) to Islamabad (ISB)  |  Aircraft: Airbus A320  |  Duration: 2hr 00min</text>
    <text x="45" y="294" font-family="Arial, sans-serif" font-size="18" fill="#0f172a" font-weight="bold">E-Ticket Number: 214-5920184736     |     Baggage: 30 KG     |     Seat: 12F</text>
    <text x="45" y="336" font-family="Arial, sans-serif" font-size="17" fill="#475569">Base Fare: PKR 24,500   |   Taxes: PKR 8,900   |   Total Fare: PKR 33,400</text>
  </svg>`;

  await sharp(Buffer.from(sabreTerminalSvg)).png().toFile(path.join(samplesDir, 'sabre-terminal-umrah.png'));
  await sharp(Buffer.from(emiratesWebSvg)).png().toFile(path.join(samplesDir, 'emirates-web-pnr.png'));
  await sharp(Buffer.from(domesticPortalSvg)).png().toFile(path.join(samplesDir, 'pia-domestic-pnr.png'));
}

module.exports = { ensureSampleScreenshots };
