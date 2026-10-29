const HttpError = require('../middleware/HttpError');
const { parseListQuery, parseId } = require('../validators/products.validator');
const productsService = require('../services/products.service');

async function getProducts(req, res) {
  const params = parseListQuery(req.query);
  const result = await productsService.listProducts(params);
  res.status(200).json(result);
}

async function getProduct(req, res) {
  const id = parseId(req.params.id);
  const product = await productsService.getProductById(id);
  if (!product) {
    throw new HttpError(404, `Product with id ${id} not found`);
  }
  res.status(200).json(product);
}

module.exports = { getProducts, getProduct };
