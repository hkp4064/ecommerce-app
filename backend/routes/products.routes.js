const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/products.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.getProducts));
router.get('/:id', asyncHandler(controller.getProduct));

module.exports = router;
