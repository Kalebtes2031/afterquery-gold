// src/routes/auth/exchange-token.js
const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Reuse the API key middleware
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
};

/**
 * POST /auth/exchange-token
 * Client sends Firebase ID token → server verifies it → returns custom JWT
 */
router.post('/exchange-token', checkApiKey, async (req, res) => {
  const { firebaseToken } = req.body;

  if (!firebaseToken) {
    return res.status(400).json({ error: 'firebaseToken is required' });
  }

  try {
    // 1. Verify Firebase ID token (from client SDK)
    const decodedFirebase = await admin.auth().verifyIdToken(firebaseToken);
    const uid = decodedFirebase.uid;
    const email = decodedFirebase.email?.toLowerCase();

    // 2. Get user profile from Firestore to include role, etc.
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();

    // 3. Create your custom JWT with useful claims
    const customToken = jwt.sign(
      {
        uid,
        email,
        role: userData.role || 'customer',
        branchId: userData.branchId || null,
        // Add more claims later if needed (phone, name, etc.)
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // ← change to '1h' later when we add refresh token
    );

    res.json({
      success: true,
      token: customToken,
      user: {
        uid,
        email,
        role: userData.role,
        // Don't send sensitive data here
      }
    });
  } catch (error) {
    console.error('Token exchange failed:', error);
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

module.exports = router;