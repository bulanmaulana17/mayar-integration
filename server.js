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
    if (!MAYAR_SECRET_KEY) {
      console.error('❌ Error: MAYAR_SECRET_KEY not set');
      return res.status(500).json({ error: 'MAYAR_SECRET_KEY not set' });
    }

    const payload = { amount, currency, description, metadata, customer };
    console.log('➡️ Payload kirim ke Mayar:', JSON.stringify(payload));

    const r = await fetch(`${MAYAR_API_BASE}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAYAR_SECRET_KEY}`
      },
      body: JSON.stringify(payload)
    });

    // Perbaikan: Tambahkan penanganan untuk respons non-JSON
    let data;
    try {
      // Cek apakah respons memiliki Content-Type: application/json
      const contentType = r.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await r.json();
      } else {
        const errorText = await r.text();
        console.error('⬅️ Response non-JSON dari Mayar:', errorText);
        return res.status(r.status).json({ error: 'Respons dari Mayar bukan JSON yang valid', details: errorText });
      }
    } catch (parseError) {
      console.error('🔥 Error parsing JSON dari Mayar:', parseError);
      return res.status(500).json({ error: 'Gagal memproses respons dari Mayar', details: parseError.message });
    }

    console.log('⬅️ Response status:', r.status);
    console.log('⬅️ Response body:', JSON.stringify(data));

    if (!r.ok) {
      return res.status(r.status).json({ error: data });
    }

    // Perbaikan: Menggunakan path yang lebih spesifik sesuai dokumentasi Mayar
    const transactionId = data?.data?.id;

    if (!transactionId) {
      console.error('❌ Transaction ID tidak ditemukan di respons Mayar');
      return res.status(500).json({ error: 'Gagal mendapatkan ID transaksi dari Mayar', raw: data });
    }

    res.json({
      transaction_id: transactionId,
      raw: data
    });

  } catch (err) {
    console.error('🔥 Error di create-transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook
app.post('/api/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('📩 Webhook received:', JSON.stringify(body).slice(0, 500));

    const eventName = body.event_name || body.type || (body.data && body.data.status) || 'unknown';
    
    // Perbaikan: Mengambil data metadata secara lebih konsisten
    const meta = body.data?.metadata || {};
    const { userId, planType, isYearly } = meta;

    if (
      eventName === 'payment.paid' ||
      eventName === 'transaction.paid' ||
      eventName === 'paid' ||
      (body.data && body.data.status === 'PAID')
    ) {
      if (admin.apps.length && userId) {
        const db = admin.firestore();
        await db.doc(`users/${userId}`).set(
          {
            plan: planType || 'pro', // Menggunakan planType dari metadata
            planPurchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            planDuration: isYearly ? 'yearly' : 'monthly', // Menggunakan isYearly dari metadata
          },
          { merge: true }
        );
        console.log(`✅ Updated plan for user ${userId}`);
      } else {
        console.log('⚠️ No Firebase or userId not found in metadata');
      }
    }
    res.status(200).send('ok');
  } catch (e) {
    console.error('🔥 Error di webhook:', e);
    res.status(500).send('error');
  }
});

// Local run (Vercel tidak pakai ini)
if (process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

// Export untuk Vercel
module.exports = app;