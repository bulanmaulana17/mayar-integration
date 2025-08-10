// server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

const MAYAR_SECRET_KEY = process.env.MAYAR_SECRET_KEY || '';
const MAYAR_API_BASE = process.env.MAYAR_API_BASE || 'https://api.mayar.id';
const PORT = process.env.PORT || 3000;

// Firebase init
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
    console.log('✅ Firebase Admin initialized');
  } catch (e) {
    console.warn('⚠️ Failed to init Firebase Admin:', e.message);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Server is running 🚀' });
});

// Create transaction
app.post('/api/create-transaction', async (req, res) => {
  try {
    const { amount, currency = 'IDR', description = 'Subscription', metadata = {}, customer = {} } = req.body;
    if (!MAYAR_SECRET_KEY) return res.status(500).json({ error: 'MAYAR_SECRET_KEY not set' });

    const payload = { amount, currency, description, metadata, customer };
    const r = await fetch(`${MAYAR_API_BASE}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAYAR_SECRET_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });

    res.json({
      transaction_id: data.id || data.transaction_id || data.data?.id,
      raw: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook
app.post('/api/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('📩 Webhook received:', JSON.stringify(body).slice(0, 500));

    const eventName = body.event_name || body.type || (body.data && body.data.status) || 'unknown';
    if (eventName === 'payment.paid' || eventName === 'transaction.paid' || eventName === 'paid' || (body.data && body.data.status === 'PAID')) {
      const meta = (body.data && body.data.metadata) || {};
      const userId = meta.userId || meta.user_id;
      if (admin.apps.length && userId) {
        const db = admin.firestore();
        await db.doc(`users/${userId}`).set({
          plan: meta.planType || 'pro',
          planPurchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          planDuration: meta.isYearly ? 'yearly' : 'monthly'
        }, { merge: true });
        console.log(`✅ Updated plan for user ${userId}`);
      } else {
        console.log('⚠️ No Firebase or userId not found in metadata');
      }
    }
    res.status(200).send('ok');
  } catch (e) {
    res.status(500).send('error');
  }
});

// Local run (Vercel tidak pakai ini)
if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

// Export untuk Vercel
module.exports = app;
