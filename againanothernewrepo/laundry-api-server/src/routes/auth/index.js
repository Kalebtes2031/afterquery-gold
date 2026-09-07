// src/routes/auth/index.js
const express = require('express');
const signupRouter = require('./signup');
const googleSignupRouter = require('./google-signup');
const exchangeTokenRouter = require('./exchange-token');
const signinRouter = require('./signin');

const router = express.Router();


router.use('/', signupRouter);  // mounts /signup
router.use('/', googleSignupRouter);  // mounts /google-signup
router.use('/', exchangeTokenRouter);  // mounts /exchange-token
router.use('/', signinRouter);  // mounts /signin

// Later you can add:
// const signinRouter = require('./signin');
// router.use('/', signinRouter);


module.exports = router;