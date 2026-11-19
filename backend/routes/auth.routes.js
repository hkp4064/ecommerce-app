const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const { loginLimiter } = require('../middleware/rateLimiters');
const controller = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', asyncHandler(controller.register));
router.post('/login', loginLimiter, asyncHandler(controller.login));
router.post('/logout', requireAuth, asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

module.exports = router;
