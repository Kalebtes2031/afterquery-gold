// src/routes/auth/google-signup.js — Handle Google OAuth + Phone
const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Middleware: Require X-Api-Key header
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
};

// POST /google-signup — Complete Google user profile with phone
router.post('/google-signup', checkApiKey, async (req, res) => {
  const { uid, email, name, phone } = req.body;

  // Validation
  if (!uid || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields: uid, email, phone' });
  }
  if (phone.length !== 12 || !phone.startsWith('254')) {
    return res.status(400).json({ error: 'Invalid phone number format (must be 254XXXXXXXXX)' });
  }

  try {
    // Verify the user exists in Firebase Auth
    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found in authentication' });
    }

    // Check if user doc already exists (prevent duplicate creation)
    // Check if user doc already exists (prevent duplicate creation)
const userDoc = await admin.firestore().collection('users').doc(uid).get();
if (userDoc.exists) {  // ← fixed
  return res.status(409).json({ error: 'User profile already exists' });
}

    // Create user profile in Firestore
    await admin.firestore().collection('users').doc(uid).set({
      uid,
      email: email.toLowerCase().trim(),
      name: (name || 'Customer').trim(),
      phone,
      role: 'customer',
      authProvider: 'google',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate custom token for immediate sign-in
    const token = await admin.auth().createCustomToken(uid);

    res.json({ success: true, token });
  } catch (error) {
    console.error('Google signup error:', error);
    res.status(500).json({ error: 'Failed to complete signup. Please try again.' });
  }
});

module.exports = router;

