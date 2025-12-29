// src/controllers/authController.js - Updated
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { db } = require('../config/firebase');

// Regex patterns for validation
const validationPatterns = {
  username: /^[a-zA-Z0-9_]{3,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  mobileNumber: /^\+\d{1,4}\d{7,15}$/ // + followed by country code (1-4 digits) and phone number (7-15 digits)
};

// Generate JWT Token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '7d' }
  );
};

// Hash Password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Compare Password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Signup Controller
exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, name, email, mobileNumber, password } = req.body;

    // Additional server-side validation
    if (!validationPatterns.username.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)' 
      });
    }

    if (!validationPatterns.email.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    if (!validationPatterns.mobileNumber.test(mobileNumber)) {
      return res.status(400).json({ 
        error: 'Please enter a valid mobile number with country code' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if username already exists
    const existingUsername = await db.queryByChild('users', 'username', username);
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = await db.queryByChild('users', 'email', email);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user object
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userData = {
      username,
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      role: 'user',
      subscriptionTier: 'free',
      qrCodesGenerated: 0,
      emailVerified: false,
      phoneVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firebase Realtime Database
    await db.set(`users/${userId}`, userData);

    // Generate JWT token
    const token = generateToken(userId, email);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        username,
        name,
        email,
        mobileNumber,
        role: 'user',
        subscriptionTier: 'free'
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Error creating account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login Controller
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const users = await db.queryByChild('users', 'email', email);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    console.log("isValidPassword",isValidPassword)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user.id, email);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

// Get Current User
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    
    // Get fresh data from database
    const userData = await db.get(`users/${user.id}`);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = userData;

    res.json({
      success: true,
      user: {
        id: user.id,
        ...userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
};