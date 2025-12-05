const express = require('express');
const router = express.Router();

/**
 * POST /api/v1/webhooks/escrow-events
 * Receives escrow lifecycle events from payment-service
 *
 * Example event payload (from indexer):
 * {
 *   "event": "escrow.released",
 *   "escrowId": "escrow_123",
 *   "orderId": "ord_123",
 *   "amountEth": 1.2,
 *   "state": "released",
 *   "updatedAt": "2025-12-01T00:10:00Z"
 * }
 */
router.post('/escrow-events', async (req, res) => {
  try {
    console.log("📩 [Webhook] Escrow Event Received:");
    console.log(JSON.stringify(req.body, null, 2));   // Pretty print request

    const { event, escrowId, orderId, state } = req.body;

    console.log("🔍 Parsed event details:", {
      event,
      escrowId,
      orderId,
      state
    });

    // Handle events
    switch (event) {
      case "escrow.released":
        console.log(`💸 Payment released for order ${orderId} | escrow=${escrowId}`);
        // TODO: update order status in DB -> delivered/paid
        break;

      case "escrow.refunded":
        console.log(`↩️ Refund completed for order ${orderId}`);
        // TODO: update order status in DB -> refunded
        break;

      case "escrow.disputed":
        console.log(`⚠️ Dispute initiated for order ${orderId}`);
        // TODO: mark dispute in DB
        break;

      default:
        console.log("ℹ️ Unrecognized event:", event);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err.message);
    return res.status(500).json({
      error: "WebhookHandlerError",
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
