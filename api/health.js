// api/health.js
const admin = require('firebase-admin');

// Periksa apakah aplikasi Firebase sudah diinisialisasi
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase initialized successfully");
  } catch (error) {
    // Tangani error parsing JSON atau inisialisasi
    console.error("Firebase init error:", error.message);
  }
}

export default async function handler(req, res) {
  try {
    // Test koneksi Firestore
    await admin.firestore().listCollections();

    res.status(200).json({
      status: "ok",
      firebase: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Firestore error:", error.message);
    res.status(500).json({
      status: "error",
      firebase: false,
      message: "The default Firebase app does not exist. Make sure you call initializeApp() before using any of the Firebase services.",
    });
  }
}