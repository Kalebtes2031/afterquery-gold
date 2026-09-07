// src/routes/auth/signin.js — Matches signup pattern
const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();

const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
};

router.post('/signin', checkApiKey, async (req, res) => {
  const { email, firebaseToken } = req.body;

  if (!email || !firebaseToken) {
    return res.status(400).json({ error: 'Missing email or firebaseToken' });
  }

  try {
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const uid = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const tokenPayload = {
      uid: uid,
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      role: userData.role,
      branchId: userData.branchId || null,
      branchName: userData.branchName || null,
    };

    const jwtToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);

    res.json({ 
      success: true, 
      token: jwtToken,
      expiresAt,
      user: {
        uid: uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        branchId: userData.branchId || null,
        branchName: userData.branchName || null,
      }
    });
  }  catch (error) {
  console.error('Sign in endpoint error:', {
    message: error.message,
    code: error.code,
    stack: error.stack ? error.stack.substring(0, 300) : 'no stack',
    fullError: error
  });

  if (error.code === 'auth/id-token-expired' || error.code === 'auth/invalid-id-token') {
    return res.status(401).json({ error: 'Invalid or expired Firebase token' });
  }

  if (error.message?.includes('JWT_SECRET')) {
    return res.status(500).json({ error: 'Server configuration error (JWT)' });
  }

  res.status(500).json({ error: 'Sign in failed. Please try again.' });
}
});

module.exports = router;