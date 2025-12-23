import { NextResponse } from "next/server";
import { google } from "googleapis";
import admin from "firebase-admin";

export const runtime = "nodejs";

function parseJsonOrBase64(raw: string) {
  const s = (raw ?? "").trim();
  if (!s) throw new Error("Empty credentials");

  // Si parece JSON, parse directo
  if (s.startsWith("{")) return JSON.parse(s);

  // Si no, asumimos base64
  const decoded = Buffer.from(s, "base64").toString("utf8").trim();

  // A veces viene con \n escapados
  const normalized = decoded.replace(/\\n/g, "\n");

  return JSON.parse(normalized);
}

function getEnvServiceAccount(prefix: "GOOGLE" | "FIREBASE") {
  // Permite JSON plano o base64
  const rawJson =
    process.env[`${prefix}_SERVICE_ACCOUNT_JSON`] ||
    process.env[`${prefix}_ADMIN_SERVICE_ACCOUNT_JSON`] ||
    "";

  const rawB64 =
    process.env[`${prefix}_SERVICE_ACCOUNT_JSON_BASE64`] ||
    process.env[`${prefix}_ADMIN_SERVICE_ACCOUNT_JSON_BASE64`] ||
    "";

  const raw = rawJson || rawB64;
  if (!raw) {
    throw new Error(
      `Missing env ${prefix}_SERVICE_ACCOUNT_JSON (or ${prefix}_SERVICE_ACCOUNT_JSON_BASE64)`
    );
  }

  return parseJsonOrBase64(raw);
}

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const serviceAccount = getEnvServiceAccount("FIREBASE");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
}

export async function GET(req: Request) {
  try {
    // --- Auth obligatorio ---
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
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.SHEET_ID || "";
    const range = process.env.GOOGLE_SHEETS_RANGE || process.env.SHEET_RANGE || "2025!A1:Z1";

    if (!spreadsheetId) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID (or SHEET_ID)" },
        { status: 500 }
      );
    }

    const sa = getEnvServiceAccount("GOOGLE");

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
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
