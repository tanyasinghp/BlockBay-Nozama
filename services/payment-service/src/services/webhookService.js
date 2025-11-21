// src/services/webhookService.js
const axios = require('axios');
const crypto = require('crypto');

const webhooks = new Map(); // in-memory for now; replace with DB for persistence

function registerWebhook({ id, url, events, secret }) {
  webhooks.set(id, { id, url, events, secret });
  return { id, url, events };
}

function listWebhooks() {
  return Array.from(webhooks.values());
}

async function deliverWebhook(eventName, payload) {
  const subscribers = Array.from(webhooks.values()).filter(w => w.events.includes(eventName) || w.events.includes('*'));
  await Promise.all(subscribers.map(async (s) => {
    try {
      const body = JSON.stringify(payload);
      const headers = { 'Content-Type': 'application/json' };
      if (s.secret) {
        const sig = crypto.createHmac('sha256', s.secret).update(body).digest('hex');
        headers['x-escrow-signature'] = sig;
      }
      await axios.post(s.url, body, { headers, timeout: 5000 });
    } catch (err) {
      console.error(`[Webhook] Delivery failed for ${s.url}:`, err.message);
      // optional: queue retries
    }
  }));
}

module.exports = { registerWebhook, listWebhooks, deliverWebhook };
