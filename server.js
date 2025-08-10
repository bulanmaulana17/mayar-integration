import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();
app.use(cors());
app.use(express.json());

// == CONFIG: read from env ==
const MAYAR_SECRET_KEY = process.env.MAYAR_SECRET_KEY || '';
const MAYAR_API_BASE = process.env.MAYAR_API_BASE || 'https://api.mayar.id'; // ubah kalau perlu
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin if FIREBASE_SERVICE_ACCOUNT is provided
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
    console.log('Firebase Admin initialized');
  } catch (e) {
    console.warn('Failed to init Firebase Admin:', e.message);
  }
}

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Create transaction endpoint (frontend calls this)
app.post('/api/create-transaction', async (req, res) => {
  try {
    const { amount, currency='IDR', description='Subscription', metadata={}, customer={} } = req.body;
    if (!MAYAR_SECRET_KEY) return res.status(500).json({ error: 'MAYAR_SECRET_KEY not set in env' });

    const payload = {
      amount,
      currency,
      description,
      metadata,
      customer
    };

    const r = await fetch(`${MAYAR_API_BASE}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAYAR_SECRET_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('Mayar create transaction failed', data);
      return res.status(r.status).json({ error: data });
    }

    // kembalikan id yang diperlukan frontend
    return res.json({
      transaction_id: data.id || data.transaction_id || data.data?.id,
      raw: data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook handler (Mayar -> this endpoint)
app.post('/api/webhook', async (req, res) => {
  try {
    // TODO: verifikasi signature header sesuai docs Mayar (cek header name & method)
    const body = req.body;
    console.log('Webhook received:', JSON.stringify(body).slice(0,1000));

    // contoh: kalau event bernama 'payment.paid' atau 'transaction.paid'
    const eventName = body.event_name || body.type || (body.data && body.data.status) || 'unknown';

    if (eventName === 'payment.paid' || eventName === 'transaction.paid' || eventName === 'paid' || (body.data && body.data.status === 'PAID')) {
      const meta = (body.data && body.data.metadata) || {};
      const userId = meta.userId || meta.user_id;
      // jika Firebase tersedia, update user plan
      if (admin.apps.length && userId) {
        const db = admin.firestore();
        await db.doc(`users/${userId}`).set({
          plan: meta.planType || 'pro',
          planPurchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          planDuration: meta.isYearly ? 'yearly' : 'monthly'
        }, { merge: true });
        console.log('Updated plan for user', userId);
      } else {
        console.log('No Firebase configured or no userId in metadata');
      }
    }

    res.status(200).send('ok');
  } catch (e) {
    console.error('Webhook handler error', e);
    res.status(500).send('error');
  }
});

app.listen(PORT, () => console.log('Server running on port', PORT));
