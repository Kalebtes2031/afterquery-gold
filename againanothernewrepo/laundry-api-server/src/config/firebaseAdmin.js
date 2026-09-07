// src/config/firebaseAdmin.js
const admin = require('firebase-admin');
require('dotenv').config();

let app;

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase Admin initialized successfully (shared config)');
  } catch (err) {
    console.error('❌ Firebase Admin init failed:', err.message);
    process.exit(1);
  }
} else {
  app = admin.app();
  console.log('✅ Firebase Admin already initialized');
}

module.exports = app;
module.exports.db = admin.firestore();   // Export Firestore directly for convenience