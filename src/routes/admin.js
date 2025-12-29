// src/routes/admin.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { db } = require('../config/firebase');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/qr-codes - Get all QR codes
router.get('/qr-codes', async (req, res) => {
  try {
    const qrCodes = await db.get('qr_codes');
    const users = await db.get('users');
    
    const enhancedQrCodes = [];
    
    if (qrCodes) {
      for (const key in qrCodes) {
        const qr = qrCodes[key];
        const userData = users && users[qr.userId] ? users[qr.userId] : {};
        
        enhancedQrCodes.push({
          id: key,
          ...qr,
          userName: userData.name || 'Unknown User',
          userEmail: userData.email || 'No email',
          userSubscription: userData.subscriptionTier || 'free'
        });
      }
    }
    
    // Sort by date (newest first)
    enhancedQrCodes.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    
    res.json({
      success: true,
      qrCodes: enhancedQrCodes
    });
  } catch (error) {
    console.error('Get all QR error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching QR codes' 
    });
  }
});

// GET /api/admin/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const qrCodes = await db.get('qr_codes');
    const users = await db.get('users');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    let total = 0;
    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    const bySubscription = {};
    const recentUsers = new Set();
    
    if (qrCodes) {
      total = Object.keys(qrCodes).length;
      
      for (const key in qrCodes) {
        const qr = qrCodes[key];
        const qrDate = new Date(qr.generatedAt);
        
        // Count today
        if (qrDate >= today) {
          todayCount++;
        }
        
        // Count this week
        if (qrDate >= oneWeekAgo) {
          weekCount++;
        }
        
        // Count this month
        if (qrDate >= oneMonthAgo) {
          monthCount++;
        }
        
        // Track recent users
        if (qrDate >= oneWeekAgo && qr.userId) {
          recentUsers.add(qr.userId);
        }
      }
    }
    
    // Count users by subscription
    if (users) {
      for (const key in users) {
        const user = users[key];
        const tier = user.subscriptionTier || 'free';
        bySubscription[tier] = (bySubscription[tier] || 0) + 1;
      }
    }
    
    res.json({
      success: true,
      stats: {
        total,
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        recentUsers: recentUsers.size,
        bySubscription
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching statistics' 
    });
  }
});

// DELETE /api/admin/qr-codes/:id - Delete QR code
router.delete('/qr-codes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if QR code exists
    const qrCode = await db.get(`qr_codes/${id}`);
    if (!qrCode) {
      return res.status(404).json({ 
        success: false,
        error: 'QR code not found' 
      });
    }
    
    await db.delete(`qr_codes/${id}`);
    
    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Delete QR error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting QR code' 
    });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await db.get('users');
    const qrCodes = await db.get('qr_codes');
    
    const userList = [];
    
    if (users) {
      for (const key in users) {
        const user = users[key];
        
        // Count user's QR codes
        let userQrCount = 0;
        if (qrCodes) {
          for (const qrKey in qrCodes) {
            if (qrCodes[qrKey].userId === key) {
              userQrCount++;
            }
          }
        }
        
        userList.push({
          id: key,
          ...user,
          qrCodesCount: userQrCount,
          // Remove password for security
          password: undefined
        });
      }
    }
    
    // Sort by creation date (newest first)
    userList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      users: userList
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching users' 
    });
  }
});

module.exports = router;