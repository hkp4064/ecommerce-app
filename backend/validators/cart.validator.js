const { z } = require('zod');
const HttpError = require('../middleware/HttpError');

const MAX_QUANTITY = 10; // maximum of one product per cart

const quantity = z.number().int().min(1).max(MAX_QUANTITY);

// .strict() rejects unknown fields, so a client-submitted "price" is a 400 error,
// not silently ignored. Prices only ever come from the products table.
const addItemSchema = z
  .object({
    product_id: z.number().int().positive(),
    quantity,
  })
  .strict();

const updateItemSchema = z.object({ quantity }).strict();

const idSchema = z.coerce.number().int().positive();

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new HttpError(400, `Invalid request (${details})`);
  }
  return result.data;
}

function parseItemId(value) {
  const result = idSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'Invalid cart item id: must be a positive integer');
  }
  return result.data;
}

module.exports = {
  MAX_QUANTITY,
  parseAddItem: (body) => parse(addItemSchema, body),
  parseUpdateItem: (body) => parse(updateItemSchema, body),
  parseItemId,
};
