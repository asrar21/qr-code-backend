// src/controllers/subscriptionController.js
const { db } = require('../config/firebase');

// Get all subscription plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await db.get('subscriptions');
    
    if (!plans) {
      // Initialize with default plans if none exist
      const defaultPlans = {
        free: {
          tier: 'free',
          price: 0,
          qrCodesLimit: 3,
          features: ['Basic QR Generation', 'Standard Colors'],
          description: 'Perfect for getting started'
        },
        basic: {
          tier: 'basic',
          price: 299,
          qrCodesLimit: 10,
          features: ['Custom Colors', 'Basic Analytics',],
          description: 'For growing businesses'
        },
        // premium: {
        //   tier: 'premium',
        //   price: 19.99,
        //   qrCodesLimit: 200,
        //   features: ['All Basic Features', 'Priority Support', 'API Access', 'Custom Branding'],
        //   description: 'For professionals & agencies'
        // }
      };
      
      await db.set('subscriptions', defaultPlans);
      return res.json({ 
        success: true, 
        plans: Object.values(defaultPlans),
        message: 'Default plans created'
      });
    }
    
    // Convert object to array
    const plansArray = Object.keys(plans).map(key => ({
      id: key,
      ...plans[key]
    }));
    
    res.json({
      success: true,
      plans: plansArray
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching subscription plans' 
    });
  }
};

// Subscribe to a plan (for testing - without payment)
exports.subscribe = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    // Get all plans
    const plans = await db.get('subscriptions');
    if (!plans || !plans[planId]) {
      return res.status(404).json({ 
        success: false,
        error: 'Plan not found' 
      });
    }

    const plan = plans[planId];

    // Update user's subscription
    await db.update(`users/${userId}`, {
      subscriptionTier: planId,
      subscriptionActive: true,
      subscriptionSince: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Record subscription history
    const subscriptionId = `sub_${Date.now()}`;
    await db.set(`subscription_history/${subscriptionId}`, {
      userId,
      planId,
      planTier: plan.tier,
      price: plan.price,
      subscribedAt: new Date().toISOString(),
      status: 'active',
      paymentMethod: 'test_mode' // For testing
    });

    // Reset QR code count for new subscription
    await db.update(`users/${userId}`, {
      qrCodesGenerated: 0
    });

    res.json({
      success: true,
      message: `Successfully subscribed to ${plan.tier} plan`,
      subscription: {
        tier: plan.tier,
        price: plan.price,
        features: plan.features,
        qrCodesLimit: plan.qrCodesLimit,
        subscribedAt: new Date().toISOString()
      },
      reset: {
        qrCodesGenerated: 0,
        message: 'Your QR code count has been reset'
      }
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing subscription' 
    });
  }
};

// Get user's current subscription
exports.getMySubscription = async (req, res) => {
  try {
    const user = req.user;
    
    // Get fresh user data
    const userData = await db.get(`users/${user.id}`);
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get subscription plan details
    const plans = await db.get('subscriptions');
    const subscriptionTier = userData.subscriptionTier || 'free';
    const plan = plans && plans[subscriptionTier] 
      ? plans[subscriptionTier] 
      : { 
          tier: 'free', 
          price: 0, 
          qrCodesLimit: 3, 
          features: ['Basic QR Generation', 'Standard Colors'] 
        };

    res.json({
      success: true,
      subscription: {
        tier: subscriptionTier,
        active: userData.subscriptionActive || true,
        subscribedSince: userData.subscriptionSince || new Date().toISOString(),
        currentUsage: userData.qrCodesGenerated || 0,
        remaining: plan.qrCodesLimit - (userData.qrCodesGenerated || 0),
        ...plan
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Error fetching subscription' });
  }
};

// Get subscription limits for user
exports.getLimits = async (req, res) => {
  try {
    const user = req.user;
    const userData = await db.get(`users/${user.id}`);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionTier = userData.subscriptionTier || 'free';
    const plans = await db.get('subscriptions');
    const plan = plans && plans[subscriptionTier] 
      ? plans[subscriptionTier] 
      : { qrCodesLimit: 3 };

    res.json({
      success: true,
      limits: {
        qrCodes: {
          used: userData.qrCodesGenerated || 0,
          limit: plan.qrCodesLimit || 3,
          remaining: (plan.qrCodesLimit || 3) - (userData.qrCodesGenerated || 0)
        },
        subscriptionTier: subscriptionTier,
        requiresUpgrade: (userData.qrCodesGenerated || 0) >= (plan.qrCodesLimit || 3)
      }
    });
  } catch (error) {
    console.error('Get limits error:', error);
    res.status(500).json({ error: 'Error fetching limits' });
  }
};