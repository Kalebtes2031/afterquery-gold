// src/routes/auth/signup.js — UPDATED: Trust frontend-normalized phone
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

// POST /signup — Public endpoint
router.post('/signup', checkApiKey, async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Basic validation (frontend already normalized phone)
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: 'Missing required fields: name, email, password, phone' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (phone.length !== 12 || !phone.startsWith('254')) {
    return res.status(400).json({ error: 'Invalid phone number format (must be 254XXXXXXXXX)' });
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase().trim(),
      password,
    });

    // Save to Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      phone, // Already normalized from frontend
      role: 'customer',
      authProvider: 'email',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate custom token
    const token = await admin.auth().createCustomToken(userRecord.uid);

    res.json({ success: true, token });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

module.exports = router;