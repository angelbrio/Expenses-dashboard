import { NextResponse } from "next/server";
import { google } from "googleapis";
import admin from "firebase-admin";

export const runtime = "nodejs";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const raw = mustGetEnv("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");

  // raw es JSON en 1 línea (string)
  const sa = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });

  return admin;
}

function getGoogleServiceAccount() {
  const raw = mustGetEnv("GOOGLE_SERVICE_ACCOUNT_JSON");

  // Si el JSON trae "\\n" en private_key (lo normal), lo convertimos a saltos reales
  const fixed = raw.replace(/\\n/g, "\n");
  const sa = JSON.parse(fixed);

  // Ojo: si ya viene como "\n" real (no debería), esto no hace daño.
  if (typeof sa.private_key === "string") {
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  }

  return sa;
}

export async function GET(req: Request) {
  try {
    // --- Auth ---
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
    const spreadsheetId = mustGetEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
    const range = process.env.GOOGLE_SHEETS_RANGE || "2025!A1:Z1";

    // --- Google Sheets client ---
    const sa = getGoogleServiceAccount();

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
