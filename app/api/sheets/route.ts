import { NextResponse } from "next/server";
import { google } from "googleapis";
import admin from "firebase-admin";

export const runtime = "nodejs";

function looksLikeBase64(s: string) {
  // base64 suele ser largo y solo [A-Za-z0-9+/=]
  return s.length > 100 && /^[A-Za-z0-9+/=]+$/.test(s) && !s.trim().startsWith("{");
}

function parseJsonOrBase64(raw: string) {
  const trimmed = raw.trim();

  // Si parece base64, lo decodificamos
  const decoded = looksLikeBase64(trimmed)
    ? Buffer.from(trimmed, "base64").toString("utf8")
    : trimmed;

  // Normaliza \n escapados (típico en claves privadas)
  const normalized = decoded.replace(/\\n/g, "\n");

  return JSON.parse(normalized);
}

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const raw =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_BASE64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 ||
    "";

  if (!raw) throw new Error("Missing env FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON (or *_BASE64)");

  const serviceAccount = parseJsonOrBase64(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
}

function getSheetsServiceAccount() {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ||
    process.env.GOOGLE_SERVICE_ACCOUNT ||
    process.env.GCP_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 ||
    process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64 ||
    "";

  if (!raw) throw new Error("Missing env GOOGLE_SERVICE_ACCOUNT_JSON (or *_BASE64)");

  return parseJsonOrBase64(raw);
}

export async function GET(req: Request) {
  try {
    // --- Auth Firebase (obligatorio porque tú lo estás usando desde el cliente) ---
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing Bearer token" }, { status: 401 });
    }

    const fb = getFirebaseAdmin();
    const decoded = await fb.auth().verifyIdToken(token);

    const allowed = process.env.ALLOWED_UID;
    if (allowed && decoded.uid !== allowed) {
      return NextResponse.json({ ok: false, error: "Forbidden (UID not allowed)" }, { status: 403 });
    }

    // --- Sheets env ---
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      process.env.SHEET_ID ||
      process.env.GOOGLE_SHEETS_SPREADSHEETID ||
      "";

    const range =
      process.env.GOOGLE_SHEETS_RANGE ||
      process.env.SHEET_RANGE ||
      "2025!A1:Z1";

    if (!spreadsheetId) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID (or SHEET_ID)" },
        { status: 500 }
      );
    }

    const sa = getSheetsServiceAccount();

    const jwt = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth: jwt });
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });

    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      email: decoded.email ?? null,
      spreadsheetId,
      range,
      values: resp.data.values ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
