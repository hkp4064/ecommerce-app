const { z } = require('zod');
const HttpError = require('../middleware/HttpError');

const email = z.string().trim().toLowerCase().email().max(254);

const registerSchema = z.object({
  email,
  name: z.string().trim().min(1).max(100),
  // bcrypt only uses the first 72 bytes, so cap the length
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});

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

module.exports = {
  parseRegister: (body) => parse(registerSchema, body),
  parseLogin: (body) => parse(loginSchema, body),
};
