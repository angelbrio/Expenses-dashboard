import admin from "firebase-admin";

export function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing env FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
}
