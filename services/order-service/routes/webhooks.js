const express = require('express');
const router = express.Router();

router.post('/escrow-events', async (req, res) => {
  console.log("Webhook received:", req.body);

  // Example: update order status when escrow is released
  if (req.body.state === 'released') {
    console.log(`Order ${req.body.orderId} payment released`);
    // TODO: update order DB
  }

  res.json({ status: "received" });
});

module.exports = router;
