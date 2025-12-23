import { NextResponse } from "next/server";
import { google } from "googleapis";
import admin from "firebase-admin";

export const runtime = "nodejs";

function parseServiceAccountFromEnv(opts: {
  jsonEnvName?: string;
  base64EnvName?: string;
  label: string;
}) {
  const rawJson = opts.jsonEnvName ? process.env[opts.jsonEnvName] : undefined;
  const rawB64 = opts.base64EnvName ? process.env[opts.base64EnvName] : undefined;

  // Preferimos BASE64 siempre (más robusto en Vercel)
  if (rawB64) {
    const jsonText = Buffer.from(rawB64, "base64").toString("utf8");
    return JSON.parse(jsonText);
  }

  // Fallback: JSON plano (solo si está bien escapado con \n dentro de private_key)
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  throw new Error(`Missing env for ${opts.label}: set ${opts.base64EnvName || opts.jsonEnvName}`);
}

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const sa = parseServiceAccountFromEnv({
    jsonEnvName: "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON",
    base64EnvName: "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_BASE64",
    label: "Firebase Admin service account",
  });

  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });

  return admin;
}

function getSheetsAuth() {
  const sa = parseServiceAccountFromEnv({
    jsonEnvName: "GOOGLE_SERVICE_ACCOUNT_JSON",
    base64EnvName: "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64",
    label: "Google Sheets service account",
  });

  return new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function GET(req: Request) {
  try {
    // --- Auth Firebase (recomendado si el sheet es privado) ---
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

    const jwt = getSheetsAuth();
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
