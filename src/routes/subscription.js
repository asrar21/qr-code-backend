// src/routes/subscription.js
const express = require('express');
const { getPlans, subscribe, getMySubscription } = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all subscription plans
router.get('/plans', getPlans);

// Subscribe to a plan
router.post('/subscribe', subscribe);

// Get current subscription
router.get('/my-subscription', getMySubscription);

module.exports = router;