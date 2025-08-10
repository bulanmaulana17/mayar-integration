// api/health.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase init error:", error.message);
  }
}

export default async function handler(req, res) {
  try {
    // Coba ambil daftar koleksi buat test koneksi
    await admin.firestore().listCollections();

    res.status(200).json({
      status: "ok",
      firebase: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      firebase: false,
      message: error.message,
    });
  }
}