// src/routes/customer/update-order.js
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

// PATCH /api/customer/orders/:orderId
router.patch('/:orderId', checkApiKey, authMiddleware, async (req, res) => {
  const { orderId } = req.params;
  const uid = req.user.uid;

  // Allowed updatable fields
  const allowedUpdates = [
    'customerName',
    'phone',
    'areaOfResidence',
    'apartment',
    'pickupTime',
    'specialInstructions',
    'mainServiceId',
    'mainServiceName',
    'packageId',
    'packageName',
    'sizeId',
    'sizeName',
    'quantity',
    'extraServices',
    'gender'
  ];

  const updates = {};
  allowedUpdates.forEach(key => {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const db = admin.firestore();
    const orderRef = db.collection('laundryOrders').doc(orderId);

    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderSnap.data();
    if (orderData.customerId !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (orderData.status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be updated' });
    }

    await orderRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedSnap = await orderRef.get();
    res.json({
      success: true,
      message: 'Order updated successfully',
      order: { id: updatedSnap.id, ...updatedSnap.data() }
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;