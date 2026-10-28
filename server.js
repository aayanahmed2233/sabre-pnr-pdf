require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const archiver = require('archiver');

const { extractPnrDetails } = require('./src/aiExtractor');
const { enrichBookingData } = require('./src/airportsDb');
const { generateSabrePdfBuffer } = require('./src/sabrePdfGenerator');
const { ensureSampleScreenshots } = require('./src/sampleGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow preview proxy hosts/origins & iframe embedding cleanly
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure no X-Frame-Options blocks live preview iframe
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

app.use(express.static(path.join(__dirname, 'public')));

// Health & Environment Key Status
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    envKeys: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY)
    }
  });
});

// Extract PNR from Uploaded Screenshot, Sample Image, or Raw PNR Text
app.post('/api/extract-pnr', upload.single('screenshot'), async (req, res) => {
  try {
    let imageBuffer = req.file ? req.file.buffer : null;
    let mimeType = req.file ? req.file.mimetype : 'image/png';

    // Support 1-click built-in sample screenshot testing
    if (!imageBuffer && req.body.sampleName) {
      const safeName = path.basename(String(req.body.sampleName));
      const samplePath = path.join(__dirname, 'public', 'samples', safeName);
      if (fs.existsSync(samplePath)) {
        imageBuffer = fs.readFileSync(samplePath);
        mimeType = 'image/png';
      }
    }

    const rawText = req.body.rawText || '';
    const provider = req.body.provider || 'free';
    const apiKey = req.body.apiKey || '';
    const model = req.body.model || '';

    if (!imageBuffer && !rawText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please upload/paste a PNR screenshot or enter PNR text first.'
      });
    }

    const result = await extractPnrDetails({
      imageBuffer,
      mimeType,
      rawText,
      provider,
      apiKey,
      model
    });

    res.json({
      success: true,
      booking: result.booking,
      engineUsed: result.engineUsed,
      ocrText: result.ocrText
    });
  } catch (err) {
    console.error('PNR Extraction Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to analyze PNR screenshot.'
    });
  }
});

// Auto-enrich airport/airline codes when user edits fields
app.post('/api/enrich', (req, res) => {
  try {
    const enriched = enrichBookingData(req.body.booking || {});
    res.json({ success: true, booking: enriched });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Generate Authentic Sabre Red 360 Vector PDF
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const booking = enrichBookingData(req.body.booking || {});
    const agency = req.body.agency || {};
    const template = req.body.template || 'sabre-classic';

    const pdfBuffer = await generateSabrePdfBuffer(booking, agency, { template });

    const cleanPnr = (booking.pnr || 'ITINERARY').replace(/[^A-Z0-9]/gi, '');
    const surname = (booking.passengers?.[0]?.name || 'PASSENGER')
      .split('/')[0]
      .replace(/[^A-Z0-9]/gi, '')
      .slice(0, 16);
    const filename = `Sabre_Red360_${cleanPnr}_${surname}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      req.query.inline === '1'
        ? `inline; filename="${filename}"`
        : `attachment; filename="${filename}"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate Sabre Red 360 PDF.'
    });
  }
});

// 1-Click Download Complete VS Code Ready Project (.zip)
app.get('/api/download-source', (req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="sabre-red360-pnr-ai-vscode.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => res.status(500).end(err.message));
  archive.pipe(res);

  const rootFiles = ['package.json', 'server.js', '.env.example', 'README.md', 'Dockerfile', '.dockerignore', 'render.yaml'];
  rootFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      archive.file(fullPath, { name: `sabre-red360-pnr-ai/${file}` });
    }
  });

  archive.directory(path.join(__dirname, 'src'), 'sabre-red360-pnr-ai/src');
  archive.directory(path.join(__dirname, 'public'), 'sabre-red360-pnr-ai/public');
  archive.finalize();
});

// Boot Server
ensureSampleScreenshots()
  .catch(err => console.warn('Sample screenshot init warning:', err.message))
  .finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Sabre Red 360 AI PNR -> PDF Server running on http://0.0.0.0:${PORT}`);
    });
  });
