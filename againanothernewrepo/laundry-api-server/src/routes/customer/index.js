// src/routes/customer/index.js
const express = require('express');
const { checkApiKey, authMiddleware } = require('../../middleware/auth');

const listRouter = require('./orders');          // only GET /orders
const addRouter = require('./add-order');        // only POST /orders
const updateRouter = require('./update-order');  // only PATCH /orders/:id
const profileRouter = require('./profile');      // only PATCH /profile

const router = express.Router();

// Apply global middlewares to ALL /api/customer routes
router.use(checkApiKey);
router.use(authMiddleware);

// Mount each sub-router
router.use('/orders', listRouter);     // GET /api/customer/orders
router.use('/add/orders', addRouter);      // POST /api/customer/orders
router.use('/orders', updateRouter);   // PATCH /api/customer/orders/:id
router.use('/profile', profileRouter); // PATCH /api/customer/profile

module.exports = router;