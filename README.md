# Mayar Integration - Template (Bahasa Indonesia)
Ini proyek template backend + frontend untuk integrasi pembayaran Mayar (checkout kit + webhook).
**PENTING:** Jangan pernah menaruh secret API key di frontend atau mem-paste secret key di chat publik. Jika kamu sudah mem-paste (atau pernah), sebaiknya revoke/regenerate di dashboard Mayar sekarang.

## Apa yang ada di paket ini
- `server.js` : Express server dengan endpoint `/api/create-transaction` dan `/api/webhook`
- `package.json` : dependency list
- `.env.example` : contoh environment variables
- `frontend.html` : contoh frontend sederhana yang memanggil backend untuk membuat transaction

## Langkah cepat (untuk pemula)
1. **Buat akun Mayar** dan aktifkan test mode. Dapatkan:
   - Publishable Key (pk_test_...)
   - Secret Key (sk_test_...) — simpan di server / Vercel env
2. **Jangan** paste secret key di chat atau commit ke repo publik. Gunakan environment variables.
3. **Deploy backend**
   - Pilih platform: Vercel (direkomendasikan), Render, Heroku.
   - Upload repo atau push ke GitHub.
   - Set Environment Variables di dashboard deploy:
     - `MAYAR_SECRET_KEY` = sk_test_xxx
     - `MAYAR_API_BASE` = https://api.mayar.id
     - `PORT` = 3000 (opsional)
     - (opsional) `FIREBASE_SERVICE_ACCOUNT` = string JSON jika pakai Firebase Admin
4. **Set webhook URL** di dashboard Mayar: `https://your-backend-url/api/webhook`
   - Untuk development lokal, gunakan `ngrok`:
     - Jalankan `npx ngrok http 3000`
     - Gunakan URL `https://abcd.ngrok.io/api/webhook`
5. **Frontend**
   - Buka `frontend.html` atau integrasikan ke project HTML-mu.
   - Ganti `BACKEND_CREATE_TX` dengan URL backend hasil deploy.
   - Pastikan `Mayar.kit` sudah di-load dan `MAYAR_PUBLISHABLE_KEY` di-set di frontend asli.
6. **Test end-to-end**
   - Klik tombol Upgrade → checkout muncul → selesaikan pembayaran di mode sandbox → cek webhook logs → cek DB/update user plan.

## Ngrok (testing webhook lokal)
1. Install: `npm i -g ngrok` (atau gunakan `npx ngrok`)
2. Jalankan server lokal: `npm run dev` (port 3000)
3. Jalankan: `npx ngrok http 3000`
4. Di dashboard Mayar, set webhook ke `https://xxxxxx.ngrok.io/api/webhook`
5. Lakukan transaksi di frontend, periksa logs server & ngrok.

## Verifikasi signature webhook (SANGAT DISARANKAN)
Mayar biasanya mengirim header signature untuk memastikan request asli. Implementasikan verifikasi HMAC sesuai dokumentasi Mayar (cek dashboard/docs Mayar untuk nama header & method).

## Troubleshooting
- 401 dari Mayar: cek SECRET_KEY & header Authorization
- transaction_id undefined: cek response dari Mayar pada `server.js` dan sesuaikan property id/path
- Mayar.kit undefined: pastikan kit.js ter-load sebelum memanggil createPayment

## Next steps gue bantuin
- Kalau mau, aku bisa:
  - Buatkan repo GitHub & zip (sudah termasuk)
  - Deploy ke Vercel dan bantu set env vars (kalo lo kasih akses atau ikuti step README)
  - Sesuaikan webhook parsing jika lo kasih contoh payload nyata dari dashboard Mayar

Good practice: **revoke** API key yang lo paste di chat ini sekarang. Buat yang baru di dashboard Mayar. Keep it safe :)
