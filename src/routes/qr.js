// src/routes/qr.js
const express = require('express');
const { 
  generateQR, 
  downloadQR, 
  getRemainingQRs 
} = require('../controllers/qrController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Generate QR code
router.post('/generate', generateQR);

// Download QR code
router.get('/download/:qrId', downloadQR);

// Get remaining QR codes
router.get('/remaining', getRemainingQRs);



module.exports = router;