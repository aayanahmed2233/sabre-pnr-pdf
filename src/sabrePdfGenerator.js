const PDFDocument = require('pdfkit');

/**
 * Draws a crisp vector airplane icon pointing right
 */
function drawAirplaneIcon(doc, x, y, size = 10, color = '#1e293b') {
  const s = size / 24;
  doc.save();
  doc.translate(x, y);
  doc.scale(s);
  doc
    .path('M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z')
    .rotate(90, { origin: [12, 12] })
    .fill(color);
  doc.restore();
}

/**
 * Draws a deterministic crisp vector Code-128 style 1D barcode for PNR + Ticket verification
 */
function drawVerificationBarcode(doc, x, y, width, height, codeText) {
  const seedStr = String(codeText || 'SABRE360PNR');
  doc.save();
  let cursor = x;
  const endX = x + width;
  let idx = 0;

  // Guard bars start
  [1.4, 1, 1.4, 1.6].forEach((w, i) => {
    if (i % 2 === 0) doc.rect(cursor, y, w, height).fill('#0f172a');
    cursor += w;
  });

  while (cursor < endX - 6) {
    const ch = seedStr.charCodeAt(idx % seedStr.length) + idx * 17;
    const barW = 0.8 + (ch % 3) * 0.65;
    const gapW = 0.8 + ((ch >> 2) % 3) * 0.55;
    if (cursor + barW > endX - 5) break;
    doc.rect(cursor, y, barW, height).fill('#0f172a');
    cursor += barW + gapW;
    idx++;
  }

  // Guard bars end
  doc.rect(endX - 4, y, 1.4, height).fill('#0f172a');
  doc.rect(endX - 1.5, y, 1.4, height).fill('#0f172a');
  doc.restore();
}

/**
 * Generates an authentic Sabre Red 360 Itinerary / E-Ticket PDF Buffer
 * Supports templates:
 *  - 'sabre-classic': Official Sabre GDS / EMXP / VirtuallyThere grey-chevron layout
 *  - 'sabre-red': Sabre Red 360 Graphical Modern Red-Accent layout
 */
function generateSabrePdfBuffer(booking = {}, agency = {}, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const template = options.template === 'sabre-red' ? 'sabre-red' : 'sabre-classic';
      const isRed = template === 'sabre-red';

      const accentColor = isRed ? '#dc2626' : '#1e293b';
      const ribbonBg = isRed ? '#1e293b' : '#e2e8f0';
      const ribbonText = isRed ? '#ffffff' : '#0f172a';
      const ribbonSubText = isRed ? '#cbd5e1' : '#475569';
      const leftBoxBg = isRed ? '#fef2f2' : '#f1f5f9';

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 32, right: 32 },
        info: {
          Title: `Sabre Red 360 Itinerary - ${booking.pnr || 'PNR'}`,
          Author: agency.name || 'Sabre Red 360 Ticketing',
          Subject: `Passenger Itinerary Receipt (${booking.pnr || ''})`,
          Creator: 'Sabre Red 360 PNR Studio'
        }
      });

      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const marginL = 32;
      const marginR = 32;
      const contentW = pageW - marginL - marginR; // ~531.28pt

      // Optional top accent bar for Sabre Red 360 Graphical style
      if (isRed) {
        doc.rect(0, 0, pageW, 6).fill('#dc2626');
      }

      let curY = isRed ? 22 : 26;

      // Top micro-label
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(isRed ? '#dc2626' : '#64748b')
        .text(
          isRed
            ? 'SABRE RED 360  •  ELECTRONIC TICKET & PASSENGER ITINERARY RECEIPT'
            : 'ELECTRONIC TICKET ITINERARY / PASSENGER RESERVATION RECEIPT',
          marginL,
          curY,
          { width: contentW, characterSpacing: 0.6 }
        );

      curY += 13;
      const headerStartY = curY;

      // ================= LEFT HEADER: ISSUE DATE, PREPARED FOR, CODES =================
      const leftColW = 295;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(String(booking.issueDate || '').toUpperCase(), marginL, curY, { width: leftColW });

      curY += 13;
      doc
        .font('Helvetica-Bold')
        .fontSize(7.2)
        .fillColor('#64748b')
        .text('PREPARED FOR', marginL, curY, { width: leftColW, characterSpacing: 0.4 });

      curY += 10;
      const passengers = Array.isArray(booking.passengers) && booking.passengers.length
        ? booking.passengers
        : [{ name: 'PASSENGER/GUEST MR', type: 'ADT' }];

      passengers.forEach(pax => {
        const paxLabel = `${String(pax.name || '').toUpperCase()}${pax.type && pax.type !== 'ADT' ? ` (${pax.type})` : ''}`;
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#0f172a')
          .text(paxLabel, marginL, curY, { width: leftColW });
        curY = doc.y + 1.5;
      });

      curY += 6;

      // Reservation Code Row
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#475569')
        .text('RESERVATION CODE', marginL, curY, { continued: false });
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(isRed ? '#dc2626' : '#0f172a')
        .text(String(booking.pnr || '------').toUpperCase(), marginL + 135, curY - 1.5);

      curY += 13;

      if (booking.airlinePnr) {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#475569')
          .text('AIRLINE RESERVATION CODE', marginL, curY);
        doc
          .font('Helvetica-Bold')
          .fontSize(9.2)
          .fillColor('#0f172a')
          .text(String(booking.airlinePnr).toUpperCase(), marginL + 135, curY - 0.8);
        curY += 13;
      }

      const leftEndY = curY;

      // ================= RIGHT HEADER: AGENCY DETAILS & OPTIONAL LOGO =================
      const rightColW = 225;
      const rightColX = marginL + contentW - rightColW;
      let rightY = headerStartY;

      if (agency?.logoDataUrl && /^data:image\/(png|jpe?g);base64,/i.test(agency.logoDataUrl)) {
        try {
          const b64 = agency.logoDataUrl.split(',')[1];
          const imgBuf = Buffer.from(b64, 'base64');
          doc.image(imgBuf, rightColX + rightColW - 110, rightY, {
            fit: [110, 34],
            align: 'right'
          });
          rightY += 38;
        } catch (_) {}
      }

      const agencyName = String(agency?.name || 'TRAVEL AGENCY & TICKETING DESK').trim().toUpperCase();
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(isRed ? '#dc2626' : '#0f172a')
        .text(agencyName, rightColX, rightY, { width: rightColW, align: 'right' });
      rightY = doc.y + 2;

      const agencyLines = [
        agency?.address,
        agency?.phone ? `Tel: ${agency.phone}` : '',
        agency?.email ? `Email: ${agency.email}` : '',
        agency?.iata ? `IATA / PCC: ${agency.iata}` : ''
      ].filter(Boolean);

      agencyLines.forEach(line => {
        doc
          .font('Helvetica')
          .fontSize(7.8)
          .fillColor('#334155')
          .text(String(line), rightColX, rightY, { width: rightColW, align: 'right' });
        rightY = doc.y + 1.5;
      });

      curY = Math.max(leftEndY, rightY) + 8;

      // Signature Sabre Thick Divider Rule
      doc.moveTo(marginL, curY).lineTo(marginL + contentW, curY).lineWidth(1.8).strokeColor(accentColor).stroke();
      if (isRed) {
        doc.moveTo(marginL, curY + 3).lineTo(marginL + contentW, curY + 3).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
        curY += 12;
      } else {
        curY += 10;
      }

      // ================= FLIGHT SEGMENTS =================
      const flights = Array.isArray(booking.flights) ? booking.flights : [];

      flights.forEach((flt, segIdx) => {
        const paxRowsHeight = 16 + passengers.length * 16.5;
        const estimatedBlockH = 22 + 86 + paxRowsHeight + 14;

        // Clean page break if block won't fit
        if (curY + estimatedBlockH > pageH - 45) {
          doc.addPage();
          if (isRed) {
            doc.rect(0, 0, pageW, 5).fill('#dc2626');
          }
          curY = 30;
        }

        // 1. SABRE CHAMFERED DEPARTURE RIBBON BAR
        const ribbonH = 21;
        const cut = 8;
        doc.save();
        doc
          .moveTo(marginL, curY)
          .lineTo(marginL + contentW - cut, curY)
          .lineTo(marginL + contentW, curY + cut)
          .lineTo(marginL + contentW, curY + ribbonH)
          .lineTo(marginL, curY + ribbonH)
          .closePath()
          .fill(ribbonBg);
        doc.restore();

        // Airplane vector icon
        drawAirplaneIcon(doc, marginL + 7, curY + 4.5, 12, isRed ? '#f87171' : '#0f172a');

        const depDateText = String(flt.departureDate || '').toUpperCase();
        const arrDateText = String(flt.arrivalDate || '').toUpperCase();
        const showArrDate = arrDateText && arrDateText !== depDateText;
        const ribbonLabel = showArrDate
          ? `DEPARTURE: ${depDateText}   •   ARRIVAL: ${arrDateText}`
          : `DEPARTURE: ${depDateText}`;

        doc
          .font('Helvetica-Bold')
          .fontSize(8.2)
          .fillColor(ribbonText)
          .text(ribbonLabel, marginL + 24, curY + 6.5, { width: 335, lineBreak: false });

        doc
          .font('Helvetica-Oblique')
          .fontSize(7)
          .fillColor(ribbonSubText)
          .text('Please verify flight times prior to departure', marginL + contentW - 190, curY + 7, {
            width: 182,
            align: 'right',
            lineBreak: false
          });

        curY += ribbonH;

        // 2. MAIN 4-COLUMN SABRE FLIGHT BOX
        const cardH = 84;
        const col1W = 132;
        const col2W = 136;
        const col3W = 136;
        const col4W = contentW - col1W - col2W - col3W; // ~127.28pt

        const col1X = marginL;
        const col2X = col1X + col1W;
        const col3X = col2X + col2W;
        const col4X = col3X + col3W;

        // Left Shaded Sabre Chevron Box (Col 1 with iconic right arrow notch)
        const notchMidY = curY + cardH / 2;
        doc.save();
        doc
          .moveTo(col1X, curY)
          .lineTo(col1X + col1W, curY)
          .lineTo(col1X + col1W, notchMidY - 6)
          .lineTo(col1X + col1W + 6, notchMidY)
          .lineTo(col1X + col1W, notchMidY + 6)
          .lineTo(col1X + col1W, curY + cardH)
          .lineTo(col1X, curY + cardH)
          .closePath()
          .fillAndStroke(leftBoxBg, '#cbd5e1');
        doc.restore();

        // Outer border for the whole 4-column card
        doc.rect(marginL, curY, contentW, cardH).lineWidth(0.75).strokeColor('#cbd5e1').stroke();

        // Vertical dividers between Col2|Col3 and Col3|Col4
        doc
          .moveTo(col3X, curY + 6)
          .lineTo(col3X, curY + cardH - 6)
          .lineWidth(0.6)
          .dash(2, { space: 2 })
          .strokeColor('#cbd5e1')
          .stroke()
          .undash();

        doc
          .moveTo(col4X, curY + 6)
          .lineTo(col4X, curY + cardH - 6)
          .lineWidth(0.6)
          .strokeColor('#cbd5e1')
          .stroke();

        // Small directional triangle between Origin (Col2) and Destination (Col3)
        doc.save();
        doc
          .moveTo(col3X - 3, curY + 22)
          .lineTo(col3X + 3.5, curY + 26)
          .lineTo(col3X - 3, curY + 30)
          .closePath()
          .fill(isRed ? '#dc2626' : '#475569');
        doc.restore();

        // ---- Populate Col 1 (Airline, Flight No, Duration, Cabin, Status) ----
        let c1Y = curY + 7;
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(String(flt.airlineName || 'AIRLINE').slice(0, 34), col1X + 8, c1Y, {
            width: col1W - 14,
            height: 19
          });
        c1Y = Math.min(doc.y + 1, curY + 26);

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(isRed ? '#dc2626' : '#0f172a')
          .text(String(flt.flightNumber || ''), col1X + 8, c1Y, { width: col1W - 14, lineBreak: false });
        c1Y += 14;

        const c1Specs = [
          ['Duration:', flt.duration || 'Non-Stop'],
          ['Cabin:', `${flt.cabin || 'Economy'} (${flt.bookingClass || 'Y'})`],
          ['Status:', flt.status || 'Confirmed']
        ];

        c1Specs.forEach(([lbl, val]) => {
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#64748b')
            .text(lbl, col1X + 8, c1Y, { continued: true })
            .font('Helvetica-Bold')
            .fillColor(lbl === 'Status:' ? '#15803d' : '#1e293b')
            .text(` ${val}`, { lineBreak: false });
          c1Y += 10.5;
        });

        // ---- Populate Col 2 (Origin Station) ----
        let c2Y = curY + 7;
        doc
          .font('Helvetica-Bold')
          .fontSize(11.5)
          .fillColor('#0f172a')
          .text(String(flt.fromCode || '---'), col2X + 10, c2Y, { continued: true })
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(`  ${String(flt.fromCity || '').slice(0, 18)}`, { lineBreak: false });
        c2Y += 14;

        doc
          .font('Helvetica')
          .fontSize(6.6)
          .fillColor('#64748b')
          .text(String(flt.fromAirportName || '').slice(0, 34), col2X + 10, c2Y, {
            width: col2W - 16,
            lineBreak: false
          });

        // Horizontal sub-divider inside Col 2
        const subRuleY = curY + 40;
        doc.moveTo(col2X + 10, subRuleY).lineTo(col2X + col2W - 8, subRuleY).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

        doc
          .font('Helvetica')
          .fontSize(6.8)
          .fillColor('#64748b')
          .text('Departing At:', col2X + 10, subRuleY + 4, { lineBreak: false });
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor('#0f172a')
          .text(String(flt.departureTime || '--:--'), col2X + 10, subRuleY + 13, { lineBreak: false });

        doc
          .font('Helvetica')
          .fontSize(6.6)
          .fillColor('#64748b')
          .text(`Terminal: `, col2X + 10, subRuleY + 27, { continued: true })
          .font('Helvetica-Bold')
          .fillColor('#334155')
          .text(String(flt.fromTerminal || 'Not Available').slice(0, 20), { lineBreak: false });

        // ---- Populate Col 3 (Destination Station) ----
        let c3Y = curY + 7;
        doc
          .font('Helvetica-Bold')
          .fontSize(11.5)
          .fillColor('#0f172a')
          .text(String(flt.toCode || '---'), col3X + 10, c3Y, { continued: true })
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(`  ${String(flt.toCity || '').slice(0, 18)}`, { lineBreak: false });
        c3Y += 14;

        doc
          .font('Helvetica')
          .fontSize(6.6)
          .fillColor('#64748b')
          .text(String(flt.toAirportName || '').slice(0, 34), col3X + 10, c3Y, {
            width: col3W - 16,
            lineBreak: false
          });

        doc.moveTo(col3X + 10, subRuleY).lineTo(col3X + col3W - 8, subRuleY).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

        doc
          .font('Helvetica')
          .fontSize(6.8)
          .fillColor('#64748b')
          .text('Arriving At:', col3X + 10, subRuleY + 4, { lineBreak: false });
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor('#0f172a')
          .text(String(flt.arrivalTime || '--:--'), col3X + 10, subRuleY + 13, { lineBreak: false });

        doc
          .font('Helvetica')
          .fontSize(6.6)
          .fillColor('#64748b')
          .text(`Terminal: `, col3X + 10, subRuleY + 27, { continued: true })
          .font('Helvetica-Bold')
          .fillColor('#334155')
          .text(String(flt.toTerminal || 'Not Available').slice(0, 20), { lineBreak: false });

        // ---- Populate Col 4 (Aircraft, Stops, Meals, Baggage) ----
        let c4Y = curY + 8;
        const c4Specs = [
          ['Aircraft:', String(flt.aircraft || 'JET AIRCRAFT').slice(0, 22)],
          ['Stop(s):', String(flt.stops || 'Non-Stop')],
          ['Meals:', String(flt.meals || 'Meal').slice(0, 20)],
          ['Baggage:', String(flt.baggage || '30 KG').slice(0, 20)]
        ];
        if (flt.operatedBy) {
          c4Specs.push(['Operated By:', String(flt.operatedBy).slice(0, 18)]);
        }

        c4Specs.forEach(([lbl, val]) => {
          doc
            .font('Helvetica')
            .fontSize(6.8)
            .fillColor('#64748b')
            .text(lbl, col4X + 7, c4Y, { lineBreak: false });
          doc
            .font('Helvetica-Bold')
            .fontSize(7.2)
            .fillColor('#0f172a')
            .text(val, col4X + 48, c4Y, { width: col4W - 52, lineBreak: false });
          c4Y += 14.5;
        });

        curY += cardH;

        // 3. ATTACHED PASSENGER & ETICKET TABLE FOR THIS SEGMENT
        const thH = 15;
        doc.rect(marginL, curY, contentW, thH).fillAndStroke('#f1f5f9', '#cbd5e1');

        const pCol1 = marginL + 7;       // Passenger Name (195pt)
        const pCol2 = marginL + 205;     // Seats (72pt)
        const pCol3 = marginL + 280;     // Class / Status (98pt)
        const pCol4 = marginL + 380;     // Baggage (65pt)
        const pCol5 = marginL + 447;     // eTicket Receipt (80pt)

        doc.font('Helvetica-Bold').fontSize(6.8).fillColor('#475569');
        doc.text('Passenger Name:', pCol1, curY + 4.2, { lineBreak: false });
        doc.text('Seats:', pCol2, curY + 4.2, { lineBreak: false });
        doc.text('Class / Status:', pCol3, curY + 4.2, { lineBreak: false });
        doc.text('Baggage:', pCol4, curY + 4.2, { lineBreak: false });
        doc.text('eTicket / Document:', pCol5, curY + 4.2, { lineBreak: false });

        curY += thH;

        passengers.forEach((pax, pIdx) => {
          const rowH = 16;
          const rowBg = pIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(marginL, curY, contentW, rowH).fillAndStroke(rowBg, '#e2e8f0');

          const paxTitle = `» ${String(pax.name || '').toUpperCase()}${pax.type ? ` (${pax.type})` : ''}`;
          doc.font('Helvetica-Bold').fontSize(7.3).fillColor('#0f172a').text(paxTitle.slice(0, 38), pCol1, curY + 4.5, { lineBreak: false });
          doc.font('Helvetica').fontSize(7.1).fillColor('#334155').text(String(pax.seat || 'Check-In Required').slice(0, 16), pCol2, curY + 4.5, { lineBreak: false });
          doc.font('Helvetica').fontSize(7.1).fillColor('#334155').text(`${flt.bookingClass || 'Y'} / ${flt.status || 'Confirmed'}`.slice(0, 20), pCol3, curY + 4.5, { lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(7.1).fillColor('#0f172a').text(String(pax.baggage || flt.baggage || '30 KG').slice(0, 14), pCol4, curY + 4.5, { lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(7.1).fillColor('#0f172a').text(String(pax.ticketNumber || booking.pnr || 'Issued / Sync').slice(0, 18), pCol5, curY + 4.5, { lineBreak: false });

          curY += rowH;
        });

        curY += 12;
      });

      // ================= OPTIONAL FARE / RECEIPT SUMMARY =================
      if (booking.fare?.showFare && (booking.fare.totalFare || booking.fare.baseFare)) {
        if (curY + 68 > pageH - 45) {
          doc.addPage();
          curY = 30;
        }
        doc.rect(marginL, curY, contentW, 16).fillAndStroke(ribbonBg, '#cbd5e1');
        doc
          .font('Helvetica-Bold')
          .fontSize(7.8)
          .fillColor(ribbonText)
          .text('AIR FARE & ELECTRONIC RECEIPT SUMMARY', marginL + 8, curY + 4.5);
        curY += 16;

        doc.rect(marginL, curY, contentW, 38).fillAndStroke('#ffffff', '#cbd5e1');
        const cur = booking.fare.currency || 'PKR';

        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Base Fare:', marginL + 10, curY + 7);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(`${cur} ${booking.fare.baseFare || '0'}`, marginL + 10, curY + 19);

        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Taxes & Carrier Fees:', marginL + 145, curY + 7);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(`${cur} ${booking.fare.taxes || 'Included'}`, marginL + 145, curY + 19);

        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Form of Payment:', marginL + 290, curY + 7);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(String(booking.fare.paymentMethod || 'CASH / INVOICE'), marginL + 290, curY + 19);

        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Total Amount:', marginL + 420, curY + 7);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(isRed ? '#dc2626' : '#0f172a').text(`${cur} ${booking.fare.totalFare || booking.fare.baseFare}`, marginL + 420, curY + 18);

        curY += 48;
      }

      // ================= OPTIONAL AGENCY / SSR REMARKS =================
      if (Array.isArray(booking.remarks) && booking.remarks.length > 0) {
        if (curY + 50 > pageH - 45) {
          doc.addPage();
          curY = 30;
        }
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155').text('ITINERARY REMARKS & SPECIAL SERVICE NOTES:', marginL, curY);
        curY += 10;
        booking.remarks.forEach(rem => {
          doc.font('Helvetica').fontSize(7.2).fillColor('#475569').text(`• ${rem}`, marginL + 4, curY, { width: contentW - 8 });
          curY = doc.y + 2;
        });
        curY += 6;
      }

      // ================= IMPORTANT SABRE GDS PASSENGER NOTICES & BARCODE FOOTER =================
      if (curY + 95 > pageH - 30) {
        doc.addPage();
        curY = 30;
      }

      doc.moveTo(marginL, curY).lineTo(marginL + contentW, curY).lineWidth(0.75).strokeColor('#cbd5e1').stroke();
      curY += 7;

      doc.font('Helvetica-Bold').fontSize(7.2).fillColor('#334155').text('IMPORTANT TRAVEL & CHECK-IN INFORMATION', marginL, curY);
      curY += 10;

      const notices = [
        '1. Please report at the airport check-in counter at least 3 hours prior to International departure and 2 hours prior to Domestic departure.',
        '2. Please reconfirm your flight schedule with the operating airline or your travel agent at least 24-72 hours prior to departure.',
        '3. Ensure your Passport has at least 6 months validity from travel date, along with valid Visa, OK-to-Board (if applicable), and health documents.',
        '4. Carriage and other services provided by the carrier are subject to conditions of carriage (Warsaw / Montreal Convention).'
      ];

      notices.forEach(line => {
        doc.font('Helvetica').fontSize(6.6).fillColor('#64748b').text(line, marginL, curY, { width: contentW });
        curY = doc.y + 1.5;
      });

      curY += 10;
      // Bottom Barcode & GDS Stamp
      drawVerificationBarcode(
        doc,
        marginL + contentW - 155,
        curY,
        155,
        20,
        `${booking.pnr || 'SABRE'}-${passengers[0]?.ticketNumber || 'ETKT'}`
      );

      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor('#475569')
        .text(`SABRE RED 360 GDS ITINERARY FORMAT  •  RESERVATION CODE: ${booking.pnr || '------'}`, marginL, curY + 4);
      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#94a3b8')
        .text('Data Protection Notice: Your personal data is processed in accordance with the applicable carrier & GDS privacy policy.', marginL, curY + 14, {
          width: contentW - 165
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateSabrePdfBuffer };
