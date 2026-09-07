// src/routes/customer/add-order.js
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

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // attaches uid, email, role, etc.
    next();
  } catch (err) {
    console.error('Custom JWT verification failed:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper: Generate laundryId like LND-YYYY-XXXX
const generateLaundryId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LND-${year}-${random}`;
};

// POST /api/customer/orders
router.post('/', checkApiKey, authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const {
    customerName,
    phone,
    areaOfResidence,
    apartment = '',
    pickupTime,
    specialInstructions = null,
    branchId,
    mainServiceId,
    mainServiceName,
    packageId = '',
    packageName = '',
    sizeId = '',
    sizeName = '',
    quantity = 1,
    extraServices = [],
    gender = null,
    linkedTo = [],          // array of previous order IDs for continue mode
    isContinue = false,     // flag from frontend
  } = req.body;

  // Basic validation
  if (!customerName || !phone || !areaOfResidence || !pickupTime || !branchId || !mainServiceId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = admin.firestore();
    const newOrderRef = db.collection('laundryOrders').doc();

    const payload = {
      customerId: uid,
      customerName: customerName.trim(),
      phone: phone.trim(),
      areaOfResidence: areaOfResidence.trim(),
      apartment: apartment.trim(),
      pickupTime,
      specialInstructions,
      branchId,
      branchName: (await db.collection('branches').doc(branchId).get()).data()?.name || '',
      mainServiceId,
      mainServiceName,
      packageId,
      packageName,
      sizeId,
      sizeName,
      quantity: Number(quantity),
      extraServices,
      gender,
      status: 'pending',
      linkedTo: linkedTo.filter(id => id), // clean array
      isLinked: linkedTo.length > 0,
      bookedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      laundryId: generateLaundryId(),
    };

    // Create new order
    await newOrderRef.set(payload);

    // Update user profile
    await db.collection('users').doc(uid).update({
      name: customerName.trim(),
      phone: phone.trim(),
      gender: gender || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If continue mode → link previous orders
    if (isContinue && linkedTo.length > 0) {
      const batch = db.batch();
      linkedTo.forEach(prevId => {
        batch.update(db.collection('laundryOrders').doc(prevId), {
          linkedTo: admin.firestore.FieldValue.arrayUnion(newOrderRef.id),
          isLinked: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: newOrderRef.id,
        ...payload,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = router;