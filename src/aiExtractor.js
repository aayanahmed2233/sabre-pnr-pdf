const path = require('path');
const fs = require('fs');
const os = require('os');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const { enrichBookingData } = require('./airportsDb');
const { parseGdsOrBookingText } = require('./gdsParser');

function resolveWritableTessDir() {
  const localDir = path.join(__dirname, '..', 'tessdata');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch (_) {
    const tmpDir = path.join(os.tmpdir(), 'sr360_tessdata');
    fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }
}

const TESS_CACHE_DIR = resolveWritableTessDir();

let ocrWorkerPromise = null;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        cachePath: TESS_CACHE_DIR,
        logger: () => {}
      });
      await worker.setParameters({
        preserve_interword_spaces: '1'
      });
      return worker;
    })().catch(err => {
      ocrWorkerPromise = null;
      throw err;
    });
  }
  return ocrWorkerPromise;
}

/**
 * Enhances any PNR screenshot for OCR.
 * Supports `flipPolarity: true` so mixed Light+Dark Sabre Red 360 desktop screenshots
 * (white outer Graphical UI + dark/blue inner Sabre terminal window) are read completely!
 */
async function preprocessImageForOcr(imageBuffer, { flipPolarity = false } = {}) {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const stats = await image.stats();

  const rMean = stats.channels[0]?.mean ?? 128;
  const gMean = stats.channels[1]?.mean ?? rMean;
  const bMean = stats.channels[2]?.mean ?? rMean;
  const avgBrightness = (rMean + gMean + bMean) / 3;

  const naturalDark = avgBrightness < 118;
  const shouldInvert = flipPolarity ? !naturalDark : naturalDark;
  const targetWidth = Math.max(metadata.width || 1400, 2500);

  let pipeline = sharp(imageBuffer)
    .flatten({ background: shouldInvert ? '#000000' : '#ffffff' })
    .resize({ width: Math.min(targetWidth, 3400), withoutEnlargement: false, kernel: sharp.kernel.lanczos3 })
    .grayscale();

  if (shouldInvert) {
    pipeline = pipeline.negate({ alpha: false });
  }

  return pipeline
    .normalize()
    .linear(1.25, -18) // Crisp contrast separation for Sabre blue/green/grey screens
    .sharpen({ sigma: 1.15 })
    .png()
    .toBuffer();
}

async function extractTextWithOcr(imageBuffer, options = {}) {
  const processedBuf = await preprocessImageForOcr(imageBuffer, options);
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(processedBuf);
  return (data?.text || '').trim();
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert Sabre Red 360 GDS & Airline Ticketing Specialist AI.
Inspect the PNR screenshot / GDS booking / airline ticket confirmation and extract ALL details into STRICT, VALID JSON.

RULES:
1. Extract 6-character PNR / Booking Reference (do NOT confuse flight numbers or airport codes with PNR).
2. Extract Airline PNR / Vendor Locator if present.
3. Extract ALL passengers in Sabre uppercase format "SURNAME/GIVENNAME TITLE" (e.g., "KHAN/MUHAMMAD TARIQ MR"), passenger type ("ADT", "CNN", "INF"), 13-digit ticketNumber, seat, and baggage ("30 KG", "2 PC (23KG)").
4. Extract EVERY flight segment (including Sabre cryptic like "1 SV 705Y 18NOV 3 KHIJED*HK1 0415 0625"): airlineCode (2-char IATA like SV, EK, PK, QR), airlineName, flightNumber (e.g. "SV 705"), fromCode (3-char IATA e.g. KHI), fromCity, fromTerminal, toCode (3-char IATA e.g. JED), toCity, toTerminal, departureDate, departureTime ("HH:MM"), arrivalDate, arrivalTime ("HH:MM"), cabin, bookingClass, status, duration, aircraft, meals, stops, baggage.
5. Output ONLY valid JSON matching:
{
  "pnr": "K8M4R9",
  "airlinePnr": "L9P2X4 (SV)",
  "issueDate": "28 OCT 2026",
  "status": "Confirmed",
  "passengers": [{ "name": "KHAN/MUHAMMAD TARIQ MR", "type": "ADT", "ticketNumber": "065-2498102931", "seat": "Check-In Required", "baggage": "2 PC (23KG)", "frequentFlyer": "", "meal": "Meal" }],
  "flights": [{ "airlineCode": "SV", "airlineName": "SAUDIA", "flightNumber": "SV 705", "operatedBy": "", "fromCode": "KHI", "fromCity": "KARACHI, PK", "fromAirportName": "JINNAH INTL AIRPORT", "fromTerminal": "TERMINAL M", "toCode": "JED", "toCity": "JEDDAH, SA", "toAirportName": "KING ABDULAZIZ INTL AIRPORT", "toTerminal": "TERMINAL 1", "departureDate": "WEDNESDAY 18 NOV 2026", "departureTime": "04:15", "arrivalDate": "WEDNESDAY 18 NOV 2026", "arrivalTime": "06:25", "cabin": "Economy", "bookingClass": "Y", "status": "Confirmed", "duration": "4hr(s) 10min(s)", "aircraft": "BOEING 777-300ER", "meals": "Meal", "stops": "Non-Stop", "baggage": "2 PC (23KG)" }],
  "fare": { "showFare": false, "currency": "PKR", "baseFare": "", "taxes": "", "totalFare": "", "paymentMethod": "CASH / INVOICE" },
  "remarks": []
}`;

function safeExtractJson(text) {
  if (!text) return null;
  const cleaned = String(text).trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch (_) {}
    }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch (_) {}
    }
  }
  return null;
}

/**
 * Fast, surgical Free Cloud LLM flight-segment & PNR recovery (uses compact prompt on `openai-fast`)
 */
async function callFreePollinationsAi(ocrText) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const compactSystem =
      'Extract flight PNR JSON only, no markdown: {"pnr":"ABC123","airlinePnr":"","passengers":[{"name":"SURNAME/GIVEN MR","type":"ADT","ticketNumber":"","baggage":"30 KG"}],"flights":[{"airlineCode":"SV","flightNumber":"SV 705","fromCode":"KHI","toCode":"JED","departureDate":"18NOV","departureTime":"04:15","arrivalDate":"18NOV","arrivalTime":"06:25","bookingClass":"Y","status":"Confirmed"}]}';

    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'openai-fast',
        reasoning_effort: 'low',
        temperature: 0,
        messages: [
          { role: 'system', content: compactSystem },
          { role: 'user', content: ocrText.slice(0, 2500) }
        ]
      })
    });
    if (!res.ok) throw new Error(`Free AI HTTP ${res.status}`);
    const payload = await res.json();
    return safeExtractJson(payload?.choices?.[0]?.message?.content || '');
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiVision({ imageBuffer, mimeType, rawText, apiKey, model = 'gpt-4o-mini' }) {
  const userContent = [
    {
      type: 'text',
      text: rawText
        ? `Extract complete Sabre Red 360 PNR JSON from this input:\n\n${rawText}`
        : 'Read every detail (especially ALL flight segments, PNR, passengers, tickets & baggage) in this PNR screenshot and return complete Sabre Red 360 JSON.'
    }
  ];
  if (imageBuffer) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType || 'image/png'};base64,${imageBuffer.toString('base64')}`, detail: 'high' }
    });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API Error (${res.status})`);
  return safeExtractJson(data?.choices?.[0]?.message?.content);
}

async function callGeminiVision({ imageBuffer, mimeType, rawText, apiKey, model = 'gemini-2.0-flash' }) {
  const parts = [
    {
      text: `${EXTRACTION_SYSTEM_PROMPT}\n\n${rawText ? `Additional PNR Text:\n${rawText}` : 'Extract all PNR details & flight segments from this screenshot into JSON:'}`
    }
  ];
  if (imageBuffer) {
    parts.push({
      inline_data: {
        mime_type: mimeType || 'image/png',
        data: imageBuffer.toString('base64')
      }
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini API Error (${res.status})`);
  const textOut = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
  return safeExtractJson(textOut);
}

async function callGroqVision({ imageBuffer, mimeType, rawText, apiKey, model = 'meta-llama/llama-4-scout-17b-16e-instruct' }) {
  const content = [
    {
      type: 'text',
      text: `${EXTRACTION_SYSTEM_PROMPT}\n\n${rawText ? `PNR Text:\n${rawText}` : 'Extract all PNR, passenger, ticket, baggage & flight segment details from this screenshot as JSON only.'}`
    }
  ];
  if (imageBuffer) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType || 'image/png'};base64,${imageBuffer.toString('base64')}` }
    });
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Groq API Error (${res.status})`);
  return safeExtractJson(data?.choices?.[0]?.message?.content);
}

async function extractPnrDetails({ imageBuffer, mimeType, rawText = '', provider = 'free', apiKey = '', model = '' }) {
  const chosenProvider = (provider || 'free').toLowerCase();

  const effectiveKey =
    apiKey?.trim() ||
    (chosenProvider === 'openai' ? process.env.OPENAI_API_KEY : '') ||
    (chosenProvider === 'gemini' ? process.env.GEMINI_API_KEY : '') ||
    (chosenProvider === 'groq' ? process.env.GROQ_API_KEY : '') ||
    '';

  if (chosenProvider === 'openai' && effectiveKey) {
    const aiJson = await callOpenAiVision({ imageBuffer, mimeType, rawText, apiKey: effectiveKey, model: model || 'gpt-4o-mini' });
    if (aiJson) {
      return {
        booking: enrichBookingData(aiJson),
        engineUsed: `OpenAI ChatGPT Vision (${model || 'gpt-4o-mini'})`,
        ocrText: rawText || '[Direct ChatGPT Vision Scan]'
      };
    }
  }

  if (chosenProvider === 'gemini' && effectiveKey) {
    const aiJson = await callGeminiVision({ imageBuffer, mimeType, rawText, apiKey: effectiveKey, model: model || 'gemini-2.0-flash' });
    if (aiJson) {
      return {
        booking: enrichBookingData(aiJson),
        engineUsed: `Google Gemini Vision (${model || 'gemini-2.0-flash'})`,
        ocrText: rawText || '[Direct Gemini Vision Scan]'
      };
    }
  }

  if (chosenProvider === 'groq' && effectiveKey) {
    const aiJson = await callGroqVision({ imageBuffer, mimeType, rawText, apiKey: effectiveKey, model: model || 'meta-llama/llama-4-scout-17b-16e-instruct' });
    if (aiJson) {
      return {
        booking: enrichBookingData(aiJson),
        engineUsed: `Groq Llama Vision (${model || 'llama-4-scout'})`,
        ocrText: rawText || '[Direct Groq Vision Scan]'
      };
    }
  }

  // ================= FREE BUILT-IN AI MODE (DUAL-POLARITY OCR + MULTI-LAYER GDS/PORTAL ENGINE) =================
  let combinedText = String(rawText || '').trim();

  if (imageBuffer) {
    // Pass 1: Primary polarity OCR
    const pass1Text = await extractTextWithOcr(imageBuffer, { flipPolarity: false });
    combinedText = combinedText ? `${combinedText}\n\n${pass1Text}` : pass1Text;

    let parsedBooking = parseGdsOrBookingText(combinedText);

    // Pass 2: Dual-Polarity Mixed-UI Recovery!
    // Crucial when user screenshots a full Sabre Red 360 window (light outer Graphical header + dark/blue inner terminal with segments!)
    if (parsedBooking.flights.length === 0) {
      const pass2Text = await extractTextWithOcr(imageBuffer, { flipPolarity: true });
      if (pass2Text) {
        combinedText = `${combinedText}\n\n--- [Inverted Terminal Pass] ---\n${pass2Text}`;
        parsedBooking = parseGdsOrBookingText(combinedText);
      }
    }

    if (
      parsedBooking.flights.length > 0 &&
      parsedBooking.flights.every(f => /^[A-Z]{3}$/.test(f.fromCode) && /^[A-Z]{3}$/.test(f.toCode))
    ) {
      return {
        booking: parsedBooking,
        engineUsed: 'Free Built-in AI (Dual-Pass Vision OCR + Sabre GDS Segment Engine)',
        ocrText: combinedText
      };
    }
  }

  if (!combinedText) {
    throw new Error('Could not detect readable text in screenshot. Please try a clearer PNR screenshot or paste PNR text.');
  }

  const parsedBooking = parseGdsOrBookingText(combinedText);
  if (
    parsedBooking.flights.length > 0 &&
    parsedBooking.flights.every(f => /^[A-Z]{3}$/.test(f.fromCode) && /^[A-Z]{3}$/.test(f.toCode))
  ) {
    return {
      booking: parsedBooking,
      engineUsed: 'Free Built-in AI (Smart Vision OCR + Sabre GDS Segment Engine)',
      ocrText: combinedText
    };
  }

  // Layer 3: Compact Fast Cloud AI Recovery if unstructured text still lacks segments
  try {
    const aiJson = await callFreePollinationsAi(combinedText);
    if (
      aiJson &&
      Array.isArray(aiJson.flights) &&
      aiJson.flights.length > 0 &&
      /^[A-Z]{3}$/i.test(aiJson.flights[0]?.fromCode || '') &&
      /^[A-Z]{3}$/i.test(aiJson.flights[0]?.toCode || '')
    ) {
      // Keep already-parsed PNR & passengers if AI missed them
      if (!aiJson.pnr && parsedBooking.pnr && parsedBooking.pnr !== 'SBR360') {
        aiJson.pnr = parsedBooking.pnr;
      }
      if ((!aiJson.passengers || aiJson.passengers.length === 0) && parsedBooking.passengers.length > 0) {
        aiJson.passengers = parsedBooking.passengers;
      }
      return {
        booking: enrichBookingData(aiJson),
        engineUsed: 'Free Built-in AI (Vision OCR + Cloud LLM Segment Recovery)',
        ocrText: combinedText
      };
    }
  } catch (err) {
    console.warn('Free Cloud LLM fallback:', err.message);
  }

  return {
    booking: parsedBooking,
    engineUsed: 'Free Built-in AI (Smart Vision OCR + Sabre GDS Engine)',
    ocrText: combinedText
  };
}

module.exports = {
  extractPnrDetails,
  extractTextWithOcr,
  preprocessImageForOcr
};
