const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dataStore = require('../data/dataStore');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { testGoogleSheetWebhook } = require('../data/sheetsWebhook');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upi_qr_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET /api/settings - Authenticated
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await dataStore.getSettings();
    res.json({
      ...settings,
      data_adapter: dataStore.getAdapterName()
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Admin only
router.put('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      store_name,
      tagline,
      address,
      phone,
      printer_paper_width,
      receipt_footer_note,
      google_sheet_webhook_url
    } = req.body;

    const updates = {};
    if (store_name !== undefined) updates.store_name = store_name;
    if (tagline !== undefined) updates.tagline = tagline;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (printer_paper_width !== undefined) updates.printer_paper_width = printer_paper_width;
    if (receipt_footer_note !== undefined) updates.receipt_footer_note = receipt_footer_note;
    if (google_sheet_webhook_url !== undefined) updates.google_sheet_webhook_url = google_sheet_webhook_url;

    const updated = await dataStore.updateSettings(updates);
    res.json(updated);
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/upload-qr - Admin only
router.post('/upload-qr', authenticateToken, requireRole('admin'), upload.single('qr_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const qrUrl = `/uploads/${req.file.filename}`;
    const updated = await dataStore.updateSettings({ payment_qr_image_url: qrUrl });

    res.json({
      message: 'Payment QR code uploaded successfully',
      payment_qr_image_url: qrUrl,
      settings: updated
    });
  } catch (err) {
    console.error('Error uploading payment QR image:', err);
    res.status(500).json({ error: err.message || 'Failed to upload QR image' });
  }
});

// POST /api/settings/test-sheet - Admin only
router.post('/test-sheet', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { webhook_url } = req.body;
    const settings = await dataStore.getSettings();
    const urlToTest = webhook_url || settings.google_sheet_webhook_url;

    if (!urlToTest) {
      return res.status(400).json({ error: 'No Google Sheet Webhook URL provided to test' });
    }

    const result = await testGoogleSheetWebhook(urlToTest);
    res.json({
      message: 'Connection to Google Sheet verified! Test entry sent.',
      result
    });
  } catch (err) {
    console.error('Error testing Google Sheet webhook:', err);
    res.status(500).json({ error: err.message || 'Failed to connect to Google Sheet Webhook' });
  }
});

module.exports = router;
