// api/create-transaction.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Vercel Serverless Function tidak memerlukan express() atau cors()
    // Vercel sudah menangani parsing JSON secara default jika Content-Type: application/json
    
    try {
        const { amount, currency = 'IDR', description = 'Subscription', metadata = {}, customer = {} } = req.body;
        const MAYAR_SECRET_KEY = process.env.MAYAR_SECRET_KEY || '';
        const MAYAR_API_BASE = process.env.MAYAR_API_BASE || 'https://api.mayar.id';
        
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

        let data;
        try {
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
};