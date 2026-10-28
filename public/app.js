// Sabre Red 360° AI PNR Screenshot -> PDF Studio Frontend Logic

const state = {
  template: 'sabre-classic',
  lastFile: null,
  lastSampleName: '',
  ai: {
    provider: localStorage.getItem('sr360_ai_provider') || 'free',
    apiKey: localStorage.getItem('sr360_ai_key') || '',
    model: localStorage.getItem('sr360_ai_model') || ''
  },
  agency: JSON.parse(localStorage.getItem('sr360_agency') || 'null') || {
    name: 'SKYLINE TRAVELS & TOURS',
    address: 'Suite 204, Shahrah-e-Faisal, Karachi, Pakistan',
    phone: '+92 21 3452 9900',
    email: 'ticketing@skylinetravels.pk',
    iata: 'PCC: 7K4I  |  IATA: 27-3-4910',
    logoDataUrl: ''
  },
  booking: {
    pnr: 'K8M4R9',
    airlinePnr: 'L9P2X4 (SV)',
    issueDate: 'WEDNESDAY 28 OCT 2026',
    status: 'Confirmed',
    passengers: [
      {
        name: 'KHAN/MUHAMMAD TARIQ MR',
        type: 'ADT',
        ticketNumber: '065-2498102931',
        seat: 'Check-In Required',
        baggage: '2 PC (23KG EACH)'
      },
      {
        name: 'KHAN/SADIA MRS',
        type: 'ADT',
        ticketNumber: '065-2498102932',
        seat: 'Check-In Required',
        baggage: '2 PC (23KG EACH)'
      },
      {
        name: 'KHAN/HAMZA MSTR',
        type: 'CNN',
        ticketNumber: '065-2498102933',
        seat: 'Check-In Required',
        baggage: '2 PC (23KG EACH)'
      }
    ],
    flights: [
      {
        airlineCode: 'SV',
        airlineName: 'SAUDIA (SAUDI ARABIAN AIRLINES)',
        flightNumber: 'SV 705',
        operatedBy: '',
        fromCode: 'KHI',
        fromCity: 'KARACHI, PK',
        fromAirportName: 'JINNAH INTL AIRPORT',
        fromTerminal: 'TERMINAL M',
        toCode: 'JED',
        toCity: 'JEDDAH, SA',
        toAirportName: 'KING ABDULAZIZ INTL AIRPORT',
        toTerminal: 'TERMINAL 1',
        departureDate: 'WEDNESDAY 18 NOV 2026',
        departureTime: '04:15',
        arrivalDate: 'WEDNESDAY 18 NOV 2026',
        arrivalTime: '06:25',
        cabin: 'Economy',
        bookingClass: 'Y',
        status: 'Confirmed',
        duration: '4hr(s) 10min(s)',
        aircraft: 'BOEING 777-300ER',
        meals: 'Halal / Special (MOML)',
        stops: 'Non-Stop',
        baggage: '2 PC (23KG EACH)'
      },
      {
        airlineCode: 'SV',
        airlineName: 'SAUDIA (SAUDI ARABIAN AIRLINES)',
        flightNumber: 'SV 700',
        operatedBy: '',
        fromCode: 'JED',
        fromCity: 'JEDDAH, SA',
        toCode: 'KHI',
        toCity: 'KARACHI, PK',
        fromAirportName: 'KING ABDULAZIZ INTL AIRPORT',
        fromTerminal: 'TERMINAL 1',
        toAirportName: 'JINNAH INTL AIRPORT',
        toTerminal: 'TERMINAL M',
        departureDate: 'SATURDAY 28 NOV 2026',
        departureTime: '19:10',
        arrivalDate: 'SUNDAY 29 NOV 2026',
        arrivalTime: '00:50',
        cabin: 'Economy',
        bookingClass: 'Y',
        status: 'Confirmed',
        duration: '3hr(s) 40min(s)',
        aircraft: 'BOEING 777-300ER',
        meals: 'Halal / Special (MOML)',
        stops: 'Non-Stop',
        baggage: '2 PC (23KG EACH)'
      }
    ],
    fare: {
      showFare: false,
      currency: 'PKR',
      baseFare: '310,000',
      taxes: '87,500',
      totalFare: '397,500',
      paymentMethod: 'CASH / INVOICE'
    },
    remarks: []
  }
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBarcodeSvg(seedText) {
  const s = String(seedText || 'SABRE360PNR');
  let x = 0;
  const rects = [];
  [2, 1.5, 2, 2].forEach((w, i) => {
    if (i % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w}" height="28" fill="#0f172a"/>`);
    x += w;
  });
  let idx = 0;
  while (x < 195) {
    const code = s.charCodeAt(idx % s.length) + idx * 17;
    const bw = 1 + (code % 3) * 0.85;
    const gw = 1 + ((code >> 2) % 3) * 0.7;
    if (x + bw > 198) break;
    rects.push(`<rect x="${x.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="28" fill="#0f172a"/>`);
    x += bw + gw;
    idx++;
  }
  rects.push(`<rect x="200" y="0" width="2" height="28" fill="#0f172a"/>`);
  rects.push(`<rect x="204" y="0" width="2" height="28" fill="#0f172a"/>`);
  return `<svg width="208" height="28" viewBox="0 0 208 28" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`;
}

// ================= RENDER SABRE A4 LIVE PREVIEW =================
function renderSabrePreview() {
  const paper = document.getElementById('sabrePaper');
  const b = state.booking;
  const ag = state.agency;
  const isRed = state.template === 'sabre-red';

  paper.className = `sabre-paper ${isRed ? 'tpl-red' : 'tpl-classic'}`;

  const paxHeaderHtml = (b.passengers || [])
    .map(p => `<div>${esc(p.name)}${p.type && p.type !== 'ADT' ? ` (${esc(p.type)})` : ''}</div>`)
    .join('');

  const agencyLogoHtml = ag.logoDataUrl
    ? `<img src="${ag.logoDataUrl}" class="sb-agency-logo" alt="Agency Logo" />`
    : '';

  const segmentsHtml = (b.flights || [])
    .map(flt => {
      const sameDay = !flt.arrivalDate || flt.arrivalDate === flt.departureDate;
      const ribbonTitle = sameDay
        ? `DEPARTURE: ${esc(flt.departureDate)}`
        : `DEPARTURE: ${esc(flt.departureDate)} &nbsp;•&nbsp; ARRIVAL: ${esc(flt.arrivalDate)}`;

      const paxRows = (b.passengers || [])
        .map(
          p => `
          <tr>
            <td><strong>&raquo; ${esc(p.name)}${p.type ? ` (${esc(p.type)})` : ''}</strong></td>
            <td>${esc(p.seat || 'Check-In Required')}</td>
            <td>${esc(flt.bookingClass || 'Y')} / ${esc(flt.status || 'Confirmed')}</td>
            <td><strong>${esc(p.baggage || flt.baggage || '30 KG')}</strong></td>
            <td><strong>${esc(p.ticketNumber || b.pnr || 'Issued')}</strong></td>
          </tr>`
        )
        .join('');

      return `
      <div class="sb-segment">
        <div class="sb-ribbon">
          <div class="sb-ribbon-left">
            <span>✈</span>
            <span>${ribbonTitle}</span>
          </div>
          <div class="sb-ribbon-right">Please verify flight times prior to departure</div>
        </div>

        <div class="sb-flight-grid">
          <div class="sb-col-airline">
            <div class="sb-airline-name">${esc(flt.airlineName || flt.airlineCode || 'AIRLINE')}</div>
            <div class="sb-flight-no">${esc(flt.flightNumber)}</div>
            <div class="sb-kv">Duration: <strong>${esc(flt.duration || 'Non-Stop')}</strong></div>
            <div class="sb-kv">Cabin: <strong>${esc(flt.cabin || 'Economy')} (${esc(flt.bookingClass || 'Y')})</strong></div>
            <div class="sb-kv">Status: <strong class="ok">${esc(flt.status || 'Confirmed')}</strong></div>
          </div>

          <div class="sb-col-station origin">
            <span class="sb-route-arrow">▸</span>
            <div>
              <span class="sb-iata">${esc(flt.fromCode || '---')}</span>
              <span class="sb-city">${esc(flt.fromCity || '')}</span>
            </div>
            <div class="sb-airport-name">${esc(flt.fromAirportName || '')}</div>
            <div class="sb-time-lbl">Departing At:</div>
            <div class="sb-time-val">${esc(flt.departureTime || '--:--')}</div>
            <div class="sb-term">Terminal: <strong>${esc(flt.fromTerminal || 'Not Available')}</strong></div>
          </div>

          <div class="sb-col-station">
            <div>
              <span class="sb-iata">${esc(flt.toCode || '---')}</span>
              <span class="sb-city">${esc(flt.toCity || '')}</span>
            </div>
            <div class="sb-airport-name">${esc(flt.toAirportName || '')}</div>
            <div class="sb-time-lbl">Arriving At:</div>
            <div class="sb-time-val">${esc(flt.arrivalTime || '--:--')}</div>
            <div class="sb-term">Terminal: <strong>${esc(flt.toTerminal || 'Not Available')}</strong></div>
          </div>

          <div class="sb-col-specs">
            <div class="sb-kv">Aircraft: <strong>${esc(flt.aircraft || 'JET AIRCRAFT')}</strong></div>
            <div class="sb-kv">Stop(s): <strong>${esc(flt.stops || 'Non-Stop')}</strong></div>
            <div class="sb-kv">Meals: <strong>${esc(flt.meals || 'Meal')}</strong></div>
            <div class="sb-kv">Baggage: <strong>${esc(flt.baggage || '30 KG')}</strong></div>
            ${flt.operatedBy ? `<div class="sb-kv">Operated By: <strong>${esc(flt.operatedBy)}</strong></div>` : ''}
          </div>
        </div>

        <table class="sb-pax-table">
          <thead>
            <tr>
              <th style="width:36%;">Passenger Name:</th>
              <th style="width:15%;">Seats:</th>
              <th style="width:18%;">Class / Status:</th>
              <th style="width:14%;">Baggage:</th>
              <th style="width:17%;">eTicket / Document:</th>
            </tr>
          </thead>
          <tbody>
            ${paxRows}
          </tbody>
        </table>
      </div>`;
    })
    .join('');

  const fareHtml =
    b.fare?.showFare && (b.fare.totalFare || b.fare.baseFare)
      ? `
      <div class="sb-fare-box">
        <div class="sb-fare-head">AIR FARE &amp; ELECTRONIC RECEIPT SUMMARY</div>
        <div class="sb-fare-grid">
          <div><span>Base Fare:</span><strong>${esc(b.fare.currency)} ${esc(b.fare.baseFare || '0')}</strong></div>
          <div><span>Taxes &amp; Carrier Fees:</span><strong>${esc(b.fare.currency)} ${esc(b.fare.taxes || 'Included')}</strong></div>
          <div><span>Form of Payment:</span><strong>${esc(b.fare.paymentMethod || 'CASH / INVOICE')}</strong></div>
          <div><span>Total Amount:</span><strong style="color:${isRed ? '#dc2626' : '#0f172a'}">${esc(b.fare.currency)} ${esc(b.fare.totalFare || b.fare.baseFare)}</strong></div>
        </div>
      </div>`
      : '';

  const remarksHtml =
    Array.isArray(b.remarks) && b.remarks.filter(Boolean).length > 0
      ? `
      <div class="sb-remarks">
        <h4>ITINERARY REMARKS &amp; SPECIAL SERVICE NOTES:</h4>
        <ul>
          ${b.remarks.filter(Boolean).map(r => `<li>${esc(r)}</li>`).join('')}
        </ul>
      </div>`
      : '';

  paper.innerHTML = `
    <div class="sb-micro-top">
      ${isRed ? 'SABRE RED 360 &nbsp;•&nbsp; ELECTRONIC TICKET &amp; PASSENGER ITINERARY RECEIPT' : 'ELECTRONIC TICKET ITINERARY / PASSENGER RESERVATION RECEIPT'}
    </div>

    <div class="sb-header">
      <div>
        <div class="sb-issue-date">${esc(b.issueDate)}</div>
        <div class="sb-prep-label">PREPARED FOR</div>
        <div class="sb-pax-list">${paxHeaderHtml}</div>
        <div class="sb-codes-grid">
          <div class="sb-code-lbl">RESERVATION CODE</div>
          <div class="sb-code-val primary">${esc(b.pnr || '------')}</div>
          ${
            b.airlinePnr
              ? `<div class="sb-code-lbl">AIRLINE RESERVATION CODE</div>
                 <div class="sb-code-val" style="font-size:12.5px;">${esc(b.airlinePnr)}</div>`
              : ''
          }
        </div>
      </div>

      <div class="sb-agency">
        ${agencyLogoHtml}
        <div class="sb-agency-name">${esc(ag.name || 'TRAVEL AGENCY & TICKETING')}</div>
        ${ag.address ? `<div class="sb-agency-line">${esc(ag.address)}</div>` : ''}
        ${ag.phone ? `<div class="sb-agency-line">Tel: ${esc(ag.phone)}</div>` : ''}
        ${ag.email ? `<div class="sb-agency-line">Email: ${esc(ag.email)}</div>` : ''}
        ${ag.iata ? `<div class="sb-agency-line">${esc(ag.iata)}</div>` : ''}
      </div>
    </div>

    ${segmentsHtml}
    ${fareHtml}
    ${remarksHtml}

    <div class="sb-footer">
      <div class="sb-footer-title">IMPORTANT TRAVEL &amp; CHECK-IN INFORMATION</div>
      <div>1. Please report at the airport check-in counter at least 3 hours prior to International departure and 2 hours prior to Domestic departure.</div>
      <div>2. Please reconfirm your flight schedule with the operating airline or your travel agent at least 24-72 hours prior to departure.</div>
      <div>3. Ensure your Passport has at least 6 months validity from travel date, along with valid Visa, OK-to-Board (if applicable), and health documents.</div>
      <div>4. Carriage and other services provided by the carrier are subject to conditions of carriage (Warsaw / Montreal Convention).</div>

      <div class="sb-barcode-row">
        <div>
          <strong style="color:#475569; font-size:9.5px;">SABRE RED 360 GDS ITINERARY FORMAT &nbsp;•&nbsp; RESERVATION CODE: ${esc(b.pnr || '------')}</strong>
          <div style="font-size:8.6px; color:#94a3b8; margin-top:2px;">Data Protection Notice: Personal data is processed in accordance with applicable carrier &amp; GDS privacy policies.</div>
        </div>
        <div>${buildBarcodeSvg(`${b.pnr}-${b.passengers?.[0]?.ticketNumber || 'ETKT'}`)}</div>
      </div>
    </div>
  `;
}

// ================= POPULATE FORM EDITORS =================
function syncFormFromState() {
  const b = state.booking;

  document.getElementById('inpPnr').value = b.pnr || '';
  document.getElementById('inpAirlinePnr').value = b.airlinePnr || '';
  document.getElementById('inpIssueDate').value = b.issueDate || '';
  document.getElementById('inpBookingStatus').value = b.status || 'Confirmed';

  document.getElementById('chkShowFare').checked = Boolean(b.fare?.showFare);
  document.getElementById('fareFieldsWrap').classList.toggle('hidden', !b.fare?.showFare);
  document.getElementById('inpCurrency').value = b.fare?.currency || 'PKR';
  document.getElementById('inpPaymentMethod').value = b.fare?.paymentMethod || 'CASH / INVOICE';
  document.getElementById('inpBaseFare').value = b.fare?.baseFare || '';
  document.getElementById('inpTaxes').value = b.fare?.taxes || '';
  document.getElementById('inpTotalFare').value = b.fare?.totalFare || '';
  document.getElementById('inpRemarks').value = (b.remarks || []).join('\n');

  renderPassengersEditor();
  renderFlightsEditor();
  renderSabrePreview();
}

function renderPassengersEditor() {
  const container = document.getElementById('passengersContainer');
  const list = state.booking.passengers || [];
  document.getElementById('paxCountBadge').textContent = list.length;

  container.innerHTML = list
    .map(
      (pax, idx) => `
      <div class="sub-card">
        <div class="sub-card-head">
          <span>Passenger #${idx + 1}</span>
          ${list.length > 1 ? `<button type="button" class="btn-remove" data-del-pax="${idx}">✕ Remove</button>` : ''}
        </div>
        <div class="grid-2">
          <div class="field grid-span-2">
            <label>Sabre Name (SURNAME/GIVEN TITLE)</label>
            <input type="text" data-pax="${idx}" data-key="name" value="${esc(pax.name)}" />
          </div>
          <div class="field">
            <label>Type</label>
            <select data-pax="${idx}" data-key="type">
              <option value="ADT" ${pax.type === 'ADT' ? 'selected' : ''}>ADT (Adult)</option>
              <option value="CNN" ${pax.type === 'CNN' ? 'selected' : ''}>CNN (Child)</option>
              <option value="INF" ${pax.type === 'INF' ? 'selected' : ''}>INF (Infant)</option>
            </select>
          </div>
          <div class="field">
            <label>e-Ticket Number</label>
            <input type="text" data-pax="${idx}" data-key="ticketNumber" value="${esc(pax.ticketNumber)}" placeholder="e.g. 065-2498102931" />
          </div>
          <div class="field">
            <label>Seat</label>
            <input type="text" data-pax="${idx}" data-key="seat" value="${esc(pax.seat)}" placeholder="Check-In Required" />
          </div>
          <div class="field">
            <label>Baggage Allowance</label>
            <input type="text" data-pax="${idx}" data-key="baggage" value="${esc(pax.baggage)}" placeholder="30 KG / 2 PC" />
          </div>
        </div>
      </div>`
    )
    .join('');
}

function renderFlightsEditor() {
  const container = document.getElementById('flightsContainer');
  const list = state.booking.flights || [];
  document.getElementById('fltCountBadge').textContent = list.length;

  container.innerHTML = list
    .map(
      (flt, idx) => `
      <div class="sub-card">
        <div class="sub-card-head">
          <span>Segment #${idx + 1}: ${esc(flt.fromCode)} → ${esc(flt.toCode)} (${esc(flt.flightNumber)})</span>
          ${list.length > 1 ? `<button type="button" class="btn-remove" data-del-flt="${idx}">✕ Remove</button>` : ''}
        </div>
        <div class="grid-2">
          <div class="field">
            <label>Flight Number</label>
            <input type="text" data-flt="${idx}" data-key="flightNumber" data-enrich="1" value="${esc(flt.flightNumber)}" placeholder="e.g. SV 705" />
          </div>
          <div class="field">
            <label>Airline Name</label>
            <input type="text" data-flt="${idx}" data-key="airlineName" value="${esc(flt.airlineName)}" />
          </div>
          <div class="field">
            <label>From Airport (3-Letter IATA)</label>
            <input type="text" data-flt="${idx}" data-key="fromCode" data-enrich="1" maxlength="3" value="${esc(flt.fromCode)}" placeholder="KHI" />
          </div>
          <div class="field">
            <label>To Airport (3-Letter IATA)</label>
            <input type="text" data-flt="${idx}" data-key="toCode" data-enrich="1" maxlength="3" value="${esc(flt.toCode)}" placeholder="JED" />
          </div>
          <div class="field">
            <label>Departure Date</label>
            <input type="text" data-flt="${idx}" data-key="departureDate" value="${esc(flt.departureDate)}" />
          </div>
          <div class="field">
            <label>Departure Time (24h)</label>
            <input type="text" data-flt="${idx}" data-key="departureTime" data-enrich="1" value="${esc(flt.departureTime)}" placeholder="04:15" />
          </div>
          <div class="field">
            <label>Arrival Date</label>
            <input type="text" data-flt="${idx}" data-key="arrivalDate" value="${esc(flt.arrivalDate)}" />
          </div>
          <div class="field">
            <label>Arrival Time (24h)</label>
            <input type="text" data-flt="${idx}" data-key="arrivalTime" data-enrich="1" value="${esc(flt.arrivalTime)}" placeholder="06:25" />
          </div>
          <div class="field">
            <label>Origin Terminal</label>
            <input type="text" data-flt="${idx}" data-key="fromTerminal" value="${esc(flt.fromTerminal)}" />
          </div>
          <div class="field">
            <label>Destination Terminal</label>
            <input type="text" data-flt="${idx}" data-key="toTerminal" value="${esc(flt.toTerminal)}" />
          </div>
          <div class="field">
            <label>Booking Class / Cabin</label>
            <input type="text" data-flt="${idx}" data-key="bookingClass" data-enrich="1" value="${esc(flt.bookingClass)}" placeholder="Y / J / F" />
          </div>
          <div class="field">
            <label>Duration</label>
            <input type="text" data-flt="${idx}" data-key="duration" value="${esc(flt.duration)}" />
          </div>
          <div class="field">
            <label>Aircraft</label>
            <input type="text" data-flt="${idx}" data-key="aircraft" value="${esc(flt.aircraft)}" />
          </div>
          <div class="field">
            <label>Baggage</label>
            <input type="text" data-flt="${idx}" data-key="baggage" value="${esc(flt.baggage)}" />
          </div>
        </div>
      </div>`
    )
    .join('');
}

// ================= AI EXTRACTION API CALL =================
function setAiStatus(mode, title, sub = '') {
  const box = document.getElementById('aiStatusBox');
  const spinner = document.getElementById('aiSpinner');
  box.classList.remove('hidden', 'success', 'error');
  if (mode === 'loading') {
    spinner.classList.remove('hidden');
  } else {
    spinner.classList.add('hidden');
    box.classList.add(mode);
  }
  document.getElementById('aiStatusTitle').textContent = title;
  document.getElementById('aiStatusSub').textContent = sub;
}

async function runAiExtraction({ file = null, sampleName = '', rawText = '' }) {
  try {
    setAiStatus(
      'loading',
      'AI Scanning PNR Screenshot...',
      'Step 1/3: Enhancing screenshot contrast & reading PNR, flights, passengers & tickets...'
    );

    const fd = new FormData();
    if (file) fd.append('screenshot', file);
    if (sampleName) fd.append('sampleName', sampleName);
    if (rawText) fd.append('rawText', rawText);
    fd.append('provider', state.ai.provider || 'free');
    fd.append('apiKey', state.ai.apiKey || '');
    fd.append('model', state.ai.model || '');

    const res = await fetch('/api/extract-pnr', {
      method: 'POST',
      body: fd
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'AI could not extract PNR details.');
    }

    state.booking = data.booking;
    document.getElementById('ocrRawOutput').textContent = data.ocrText || 'Extracted via Direct Vision.';
    syncFormFromState();

    setAiStatus(
      'success',
      `✅ Extracted PNR: ${data.booking.pnr} (${data.booking.passengers.length} Pax, ${data.booking.flights.length} Flight Segment${data.booking.flights.length > 1 ? 's' : ''})`,
      `Engine: ${data.engineUsed} — Sabre Red 360 PDF is ready to download!`
    );
  } catch (err) {
    setAiStatus('error', '❌ Extraction Warning', err.message);
  }
}

function showUploadedPreview(srcUrl) {
  document.getElementById('dropzoneEmpty').classList.add('hidden');
  document.getElementById('dropzonePreview').classList.remove('hidden');
  document.getElementById('uploadedThumb').src = srcUrl;
}

function handleSelectedImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  state.lastFile = file;
  state.lastSampleName = '';
  const url = URL.createObjectURL(file);
  showUploadedPreview(url);
  runAiExtraction({ file });
}

// ================= PDF DOWNLOAD & PREVIEW =================
async function requestPdfBlob(inline = false) {
  const res = await fetch(`/api/generate-pdf${inline ? '?inline=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking: state.booking,
      agency: state.agency,
      template: state.template
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate PDF');
  }
  return res.blob();
}

async function downloadSabrePdf() {
  const btn = document.getElementById('btnDownloadPdf');
  const origText = btn.innerHTML;
  try {
    btn.disabled = true;
    btn.innerHTML = '⏳ Generating Sabre PDF...';

    const blob = await requestPdfBlob(false);
    const url = URL.createObjectURL(blob);
    const cleanPnr = (state.booking.pnr || 'ITINERARY').replace(/[^A-Z0-9]/gi, '');
    const surname = (state.booking.passengers?.[0]?.name || 'PASSENGER')
      .split('/')[0]
      .replace(/[^A-Z0-9]/gi, '');

    const a = document.createElement('a');
    a.href = url;
    a.download = `Sabre_Red360_${cleanPnr}_${surname}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    alert('PDF Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

async function openVectorPdfModal() {
  try {
    const blob = await requestPdfBlob(true);
    const url = URL.createObjectURL(blob);
    document.getElementById('pdfPreviewFrame').src = url;
    document.getElementById('pdfPreviewModal').classList.remove('hidden');
  } catch (err) {
    alert('Preview Error: ' + err.message);
  }
}

// ================= EVENT LISTENERS =================
function updateAiBadge() {
  const names = {
    free: 'AI: Free Built-in (Active)',
    gemini: 'AI: Gemini Vision',
    groq: 'AI: Groq Vision',
    openai: 'AI: ChatGPT Vision'
  };
  document.getElementById('aiModeLabel').textContent = names[state.ai.provider] || names.free;
}

document.addEventListener('DOMContentLoaded', () => {
  updateAiBadge();
  syncFormFromState();

  // Tabs (Image vs Text)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Dropzone Click & Drag-and-Drop
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  dropzone.addEventListener('click', e => {
    if (e.target.closest('#btnRescan')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files?.[0]) handleSelectedImageFile(e.target.files[0]);
  });

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer?.files?.[0]) handleSelectedImageFile(e.dataTransfer.files[0]);
  });

  // Global Ctrl+V Screenshot Paste Support!
  window.addEventListener('paste', e => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleSelectedImageFile(file);
          break;
        }
      }
    }
  });

  document.getElementById('btnRescan').addEventListener('click', e => {
    e.stopPropagation();
    if (state.lastFile) runAiExtraction({ file: state.lastFile });
    else if (state.lastSampleName) runAiExtraction({ sampleName: state.lastSampleName });
  });

  document.getElementById('btnChangeImg').addEventListener('click', e => {
    e.stopPropagation();
    fileInput.click();
  });

  // Sample Screenshot Pills
  document.querySelectorAll('.sample-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const sampleName = pill.dataset.sample;
      state.lastFile = null;
      state.lastSampleName = sampleName;
      showUploadedPreview(`/samples/${sampleName}`);
      runAiExtraction({ sampleName });
    });
  });

  // Raw Text Parse
  document.getElementById('btnParseText').addEventListener('click', () => {
    const txt = document.getElementById('rawPnrInput').value.trim();
    if (!txt) return alert('Please paste PNR text first.');
    runAiExtraction({ rawText: txt });
  });

  // Header Booking Inputs
  document.getElementById('inpPnr').addEventListener('input', e => {
    state.booking.pnr = e.target.value.toUpperCase();
    renderSabrePreview();
  });
  document.getElementById('inpAirlinePnr').addEventListener('input', e => {
    state.booking.airlinePnr = e.target.value.toUpperCase();
    renderSabrePreview();
  });
  document.getElementById('inpIssueDate').addEventListener('input', e => {
    state.booking.issueDate = e.target.value.toUpperCase();
    renderSabrePreview();
  });
  document.getElementById('inpBookingStatus').addEventListener('change', e => {
    state.booking.status = e.target.value;
    state.booking.flights.forEach(f => { f.status = e.target.value; });
    renderFlightsEditor();
    renderSabrePreview();
  });

  // Passengers Dynamic Delegation
  document.getElementById('passengersContainer').addEventListener('input', e => {
    const idx = e.target.dataset.pax;
    const key = e.target.dataset.key;
    if (idx !== undefined && key) {
      state.booking.passengers[Number(idx)][key] = key === 'name' ? e.target.value.toUpperCase() : e.target.value;
      renderSabrePreview();
    }
  });

  document.getElementById('passengersContainer').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-del-pax]');
    if (delBtn) {
      const idx = Number(delBtn.dataset.delPax);
      state.booking.passengers.splice(idx, 1);
      renderPassengersEditor();
      renderSabrePreview();
    }
  });

  document.getElementById('btnAddPax').addEventListener('click', () => {
    state.booking.passengers.push({
      name: 'NEW/PASSENGER MR',
      type: 'ADT',
      ticketNumber: '',
      seat: 'Check-In Required',
      baggage: state.booking.flights?.[0]?.baggage || '30 KG'
    });
    renderPassengersEditor();
    renderSabrePreview();
  });

  // Flights Dynamic Delegation + Auto Airport/Airline Enrichment
  document.getElementById('flightsContainer').addEventListener('input', e => {
    const idx = e.target.dataset.flt;
    const key = e.target.dataset.key;
    if (idx !== undefined && key) {
      const val = ['fromCode', 'toCode', 'flightNumber', 'bookingClass', 'airlineName', 'aircraft'].includes(key)
        ? e.target.value.toUpperCase()
        : e.target.value;
      state.booking.flights[Number(idx)][key] = val;
      renderSabrePreview();
    }
  });

  document.getElementById('flightsContainer').addEventListener('change', async e => {
    if (e.target.dataset.enrich === '1') {
      const idx = Number(e.target.dataset.flt);
      const key = e.target.dataset.key;
      const flt = state.booking.flights[idx];
      if (key === 'fromCode') { flt.fromCity = ''; flt.fromAirportName = ''; flt.duration = ''; }
      if (key === 'toCode') { flt.toCity = ''; flt.toAirportName = ''; flt.duration = ''; }
      if (key === 'flightNumber') { flt.airlineCode = ''; flt.airlineName = ''; }
      if (key === 'departureTime' || key === 'arrivalTime') { flt.duration = ''; }
      if (key === 'bookingClass') { flt.cabin = ''; }

      try {
        const res = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking: state.booking })
        });
        const data = await res.json();
        if (data.success) {
          state.booking = data.booking;
          renderFlightsEditor();
          renderSabrePreview();
        }
      } catch (_) {}
    }
  });

  document.getElementById('flightsContainer').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-del-flt]');
    if (delBtn) {
      const idx = Number(delBtn.dataset.delFlt);
      state.booking.flights.splice(idx, 1);
      renderFlightsEditor();
      renderSabrePreview();
    }
  });

  document.getElementById('btnAddFlight').addEventListener('click', () => {
    const prev = state.booking.flights[state.booking.flights.length - 1];
    state.booking.flights.push({
      airlineCode: prev?.airlineCode || 'PK',
      airlineName: prev?.airlineName || 'PAKISTAN INTERNATIONAL AIRLINES',
      flightNumber: 'PK 303',
      fromCode: prev?.toCode || 'ISB',
      fromCity: prev?.toCity || 'ISLAMABAD, PK',
      fromAirportName: prev?.toAirportName || 'ISLAMABAD INTL AIRPORT',
      fromTerminal: 'MAIN TERMINAL',
      toCode: prev?.fromCode || 'KHI',
      toCity: prev?.fromCity || 'KARACHI, PK',
      toAirportName: prev?.fromAirportName || 'JINNAH INTL AIRPORT',
      toTerminal: 'TERMINAL M',
      departureDate: prev?.departureDate || 'WEDNESDAY 25 NOV 2026',
      departureTime: '18:00',
      arrivalDate: prev?.departureDate || 'WEDNESDAY 25 NOV 2026',
      arrivalTime: '20:00',
      cabin: 'Economy',
      bookingClass: 'Y',
      status: 'Confirmed',
      duration: '2hr(s) 00min(s)',
      aircraft: 'AIRBUS A320',
      meals: 'Meal',
      stops: 'Non-Stop',
      baggage: '30 KG'
    });
    renderFlightsEditor();
    renderSabrePreview();
  });

  // Fare & Remarks
  document.getElementById('chkShowFare').addEventListener('change', e => {
    state.booking.fare.showFare = e.target.checked;
    document.getElementById('fareFieldsWrap').classList.toggle('hidden', !e.target.checked);
    renderSabrePreview();
  });

  ['inpCurrency', 'inpPaymentMethod', 'inpBaseFare', 'inpTaxes', 'inpTotalFare'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      state.booking.fare.currency = document.getElementById('inpCurrency').value;
      state.booking.fare.paymentMethod = document.getElementById('inpPaymentMethod').value;
      state.booking.fare.baseFare = document.getElementById('inpBaseFare').value;
      state.booking.fare.taxes = document.getElementById('inpTaxes').value;
      state.booking.fare.totalFare = document.getElementById('inpTotalFare').value;
      renderSabrePreview();
    });
  });

  document.getElementById('inpRemarks').addEventListener('input', e => {
    state.booking.remarks = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
    renderSabrePreview();
  });

  // Template Switcher
  document.querySelectorAll('.tpl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.template = btn.dataset.template;
      renderSabrePreview();
    });
  });

  // PDF Actions
  document.getElementById('btnDownloadPdf').addEventListener('click', downloadSabrePdf);
  document.getElementById('btnModalDownloadPdf').addEventListener('click', downloadSabrePdf);
  document.getElementById('btnOpenPdfTab').addEventListener('click', openVectorPdfModal);
  document.getElementById('btnPrintTicket').addEventListener('click', () => window.print());

  // Modals Close
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById(el.dataset.close).classList.add('hidden');
    });
  });

  // AI Settings Modal
  const selProvider = document.getElementById('selAiProvider');
  function toggleKeyBox() {
    const p = selProvider.value;
    const grp = document.getElementById('apiKeyGroup');
    grp.classList.toggle('hidden', p === 'free');
    const defaults = {
      gemini: 'gemini-2.0-flash',
      groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
      openai: 'gpt-4o-mini'
    };
    if (defaults[p] && !document.getElementById('inpAiModel').value) {
      document.getElementById('inpAiModel').value = defaults[p];
    }
  }

  document.getElementById('btnAiSettings').addEventListener('click', () => {
    selProvider.value = state.ai.provider;
    document.getElementById('inpApiKey').value = state.ai.apiKey;
    document.getElementById('inpAiModel').value = state.ai.model;
    toggleKeyBox();
    document.getElementById('aiModal').classList.remove('hidden');
  });

  selProvider.addEventListener('change', () => {
    document.getElementById('inpAiModel').value = '';
    toggleKeyBox();
  });

  document.getElementById('btnSaveAiSettings').addEventListener('click', () => {
    state.ai.provider = selProvider.value;
    state.ai.apiKey = document.getElementById('inpApiKey').value.trim();
    state.ai.model = document.getElementById('inpAiModel').value.trim();
    localStorage.setItem('sr360_ai_provider', state.ai.provider);
    localStorage.setItem('sr360_ai_key', state.ai.apiKey);
    localStorage.setItem('sr360_ai_model', state.ai.model);
    updateAiBadge();
    document.getElementById('aiModal').classList.add('hidden');
  });

  // Agency Branding Modal
  document.getElementById('btnAgencyModal').addEventListener('click', () => {
    document.getElementById('agName').value = state.agency.name || '';
    document.getElementById('agAddress').value = state.agency.address || '';
    document.getElementById('agPhone').value = state.agency.phone || '';
    document.getElementById('agEmail').value = state.agency.email || '';
    document.getElementById('agIata').value = state.agency.iata || '';
    document.getElementById('agencyModal').classList.remove('hidden');
  });

  document.getElementById('agLogoInput').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.agency.logoDataUrl = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnClearLogo').addEventListener('click', () => {
    state.agency.logoDataUrl = '';
    document.getElementById('agLogoInput').value = '';
  });

  document.getElementById('btnSaveAgency').addEventListener('click', () => {
    state.agency.name = document.getElementById('agName').value.trim();
    state.agency.address = document.getElementById('agAddress').value.trim();
    state.agency.phone = document.getElementById('agPhone').value.trim();
    state.agency.email = document.getElementById('agEmail').value.trim();
    state.agency.iata = document.getElementById('agIata').value.trim();
    localStorage.setItem('sr360_agency', JSON.stringify(state.agency));
    renderSabrePreview();
    document.getElementById('agencyModal').classList.add('hidden');
  });
});
