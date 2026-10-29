const { z } = require('zod');
const HttpError = require('../middleware/HttpError');

// Query string for GET /api/products
const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// :id path parameter
const idSchema = z.coerce.number().int().positive();

function formatIssues(error) {
  return error.issues
    .map((i) => `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`)
    .join('; ');
}

function parseListQuery(query) {
  const result = listQuerySchema.safeParse(query);
  if (!result.success) {
    throw new HttpError(400, `Invalid query parameters (${formatIssues(result.error)})`);
  }
  return result.data;
}

function parseId(value) {
  const result = idSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'Invalid product id: must be a positive integer');
  }
  return result.data;
}

module.exports = { parseListQuery, parseId };
