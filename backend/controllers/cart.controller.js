const cartService = require('../services/cart.service');
const {
  parseAddItem,
  parseUpdateItem,
  parseItemId,
} = require('../validators/cart.validator');

// The user id ALWAYS comes from the session, never from the URL or body.
const userId = (req) => req.session.userId;

async function getCart(req, res) {
  res.status(200).json(await cartService.getCart(userId(req)));
}

async function addItem(req, res) {
  const { product_id, quantity } = parseAddItem(req.body);
  const cart = await cartService.addItem(userId(req), product_id, quantity);
  res.status(201).json(cart);
}

async function updateItem(req, res) {
  const itemId = parseItemId(req.params.itemId);
  const { quantity } = parseUpdateItem(req.body);
  const cart = await cartService.updateItem(userId(req), itemId, quantity);
  res.status(200).json(cart);
}

async function removeItem(req, res) {
  const itemId = parseItemId(req.params.itemId);
  const cart = await cartService.removeItem(userId(req), itemId);
  res.status(200).json(cart);
}

module.exports = { getCart, addItem, updateItem, removeItem };
