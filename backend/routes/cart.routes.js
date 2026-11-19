const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/cart.controller');

const router = express.Router();

// Every cart route requires a logged-in user
router.use(requireAuth);

router.get('/', asyncHandler(controller.getCart));
router.post('/items', asyncHandler(controller.addItem));
router.patch('/items/:itemId', asyncHandler(controller.updateItem));
router.delete('/items/:itemId', asyncHandler(controller.removeItem));

module.exports = router;
