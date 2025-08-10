// api/health.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase init error:", error.message);
  }
}

export default async function handler(req, res) {
  try {
    // Test koneksi Firestore dengan listCollections
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
      message: error.message,
    });
  }
}
// update terakhir: 2025-08-10
