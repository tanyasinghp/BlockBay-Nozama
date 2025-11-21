// src/routes/escrow.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/escrow.controller');

router.get('/escrows', ctrl.listEscrows);
router.post('/escrows', ctrl.createEscrow);
router.get('/escrows/:escrowId', ctrl.getEscrow);
router.post('/escrows/:escrowId/release', ctrl.releaseEscrow);
router.post('/escrows/:escrowId/refund', ctrl.refundEscrow);

// Webhooks
router.post('/webhooks', ctrl.registerWebhook);

module.exports = router;
