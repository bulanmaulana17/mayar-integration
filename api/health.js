// api/health.js
const admin = require('firebase-admin');

// Inisialisasi Firebase hanya jika belum ada.
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

module.exports = (req, res) => {
  if (admin.apps.length === 0) {
    res.status(500).json({
      status: "error",
      firebase: false,
      message: "Firebase app could not be initialized.",
    });
  } else {
    res.status(200).json({
      status: "ok",
      firebase: true,
      timestamp: new Date().toISOString(),
    });
  }
};