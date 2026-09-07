// server.js — Updated with dynamic CORS for local + production
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// Dynamic CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

// If no origins are set, default to allow all for local dev (but warn)
if (allowedOrigins.length === 0) {
  console.warn('⚠️  No ALLOWED_ORIGINS set in env → allowing all origins (unsafe for production)');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without Origin header (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Allow if origin is in the list OR wildcard is present
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Api-Key', 'Authorization']
}));

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
    console.log('Firebase Admin initialized successfully');
  } catch (err) {
    console.error('Firebase Admin init failed:', err);
    process.exit(1);
  }
}

// Load routes
const authRoutes = require('./src/routes/auth');  // ← adjust if you moved routes out of src/
const customerRoutes = require('./src/routes/customer');
const uploadRouter = require('./src/routes/order/upload');
const analyticsRoutes = require('./src/routes/anlytics/analytics');


app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api', uploadRouter); 
app.use('/api', analyticsRoutes);


// Test root route
app.get('/', (req, res) => res.send('Laundry API Server is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : 'ALL (*)'}`);
});