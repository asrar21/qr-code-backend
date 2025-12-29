// src/controllers/qrController.js
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate QR Code (returns base64)
const generateQRCode = async (text, color = '#000000') => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(text, {
      color: {
        dark: color,
        light: '#FFFFFF'
      },
      width: 300,
      margin: 1
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('Error generating QR code');
  }
};

// Generate QR Code API
exports.generateQR = async (req, res) => {
  try {
    const { qrText, qrColor = '#000000' } = req.body;
    const user = req.user;

    // Check if user exists and get fresh data
    const userData = await db.get(`users/${user.id}`);
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's subscription tier
    const subscriptionTier = userData.subscriptionTier || 'free';
    
    // Get subscription limits
    const subscriptions = await db.get('subscriptions');
    const userPlan = subscriptions && subscriptions[subscriptionTier] 
      ? subscriptions[subscriptionTier] 
      : { qrCodesLimit: 3 }; // Default free limit: 3 downloads
    
    const qrCodesLimit = userPlan.qrCodesLimit || 3;
    const qrCodesGenerated = userData.qrCodesGenerated || 0;

    // Check if user has reached their limit
    if (qrCodesGenerated >= qrCodesLimit) {
      return res.status(403).json({ 
        success: false,
        error: 'QR code limit reached',
        message: `You have reached your limit of ${qrCodesLimit} QR codes. Please subscribe to continue.`,
        currentUsage: qrCodesGenerated,
        limit: qrCodesLimit,
        subscriptionTier: subscriptionTier,
        requiresSubscription: true
      });
    }

    // Generate QR Code
    const qrCodeDataURL = await generateQRCode(qrText, qrColor);

    // Update user's QR code count
    const newCount = qrCodesGenerated + 1;
    await db.update(`users/${user.id}`, {
      qrCodesGenerated: newCount,
      updatedAt: new Date().toISOString()
    });

    // Save QR code to database
    const qrId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.set(`qr_codes/${qrId}`, {
      userId: user.id,
      text: qrText,
      color: qrColor,
      qrCodeData: qrCodeDataURL,
      generatedAt: new Date().toISOString(),
      downloads: 1
    });

    res.json({
      success: true,
      message: 'QR code generated successfully',
      qrCode: qrCodeDataURL,
      qrId: qrId,
      usage: {
        current: newCount,
        limit: qrCodesLimit,
        remaining: qrCodesLimit - newCount
      },
      subscription: {
        tier: subscriptionTier,
        requiresUpgrade: (qrCodesLimit - newCount) <= 0
      }
    });

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error generating QR code'
    });
  }
};

// Download QR Code (increment download count)
exports.downloadQR = async (req, res) => {
  try {
    const { qrId } = req.params;
    const user = req.user;

    // Get QR code data
    const qrData = await db.get(`qr_codes/${qrId}`);
    if (!qrData) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Check ownership (optional - remove if you want to allow anyone to download)
    if (qrData.userId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Increment download count
    const currentDownloads = qrData.downloads || 1;
    await db.update(`qr_codes/${qrId}`, {
      downloads: currentDownloads + 1,
      lastDownloadedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'QR code ready for download',
      qrCode: qrData.qrCodeData,
      downloads: currentDownloads + 1
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Error downloading QR code' });
  }
};

// Get user's remaining QR codes
exports.getRemainingQRs = async (req, res) => {
  try {
    const user = req.user;
    
    // Get fresh user data
    const userData = await db.get(`users/${user.id}`);
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionTier = userData.subscriptionTier || 'free';
    const subscriptions = await db.get('subscriptions');
    const userPlan = subscriptions && subscriptions[subscriptionTier] 
      ? subscriptions[subscriptionTier] 
      : { qrCodesLimit: 3 };
    
    const qrCodesLimit = userPlan.qrCodesLimit || 3;
    const qrCodesGenerated = userData.qrCodesGenerated || 0;

    res.json({
      success: true,
      remaining: qrCodesLimit - qrCodesGenerated,
      used: qrCodesGenerated,
      limit: qrCodesLimit,
      subscriptionTier: subscriptionTier,
      requiresUpgrade: qrCodesGenerated >= qrCodesLimit
    });

  } catch (error) {
    console.error('Get remaining QR error:', error);
    res.status(500).json({ error: 'Error fetching QR usage' });
  }
};
