const express = require('express');

const router = express.Router();

// Controlled 500: goes through your errorHandler, so it is logged and counted as a 5xx
router.get('/fail', (req, res) => {
  throw new Error('Simulated failure for monitoring demo');
});

// Controlled latency spike (default 1.5 s, max 5 s)
router.get('/slow', async (req, res) => {
  const ms = Math.min(Number(req.query.ms) || 1500, 5000);
  await new Promise((resolve) => setTimeout(resolve, ms));
  res.json({ status: 'ok', delayedMs: ms });
});

module.exports = router;
