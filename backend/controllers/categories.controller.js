const categoriesService = require('../services/categories.service');

async function getCategories(req, res) {
  const categories = await categoriesService.listCategories();
  res.status(200).json(categories);
}

module.exports = { getCategories };
