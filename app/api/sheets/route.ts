import { NextResponse } from "next/server";
import { google } from "googleapis";
import admin from "firebase-admin";

export const runtime = "nodejs";

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const raw =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    "";

  if (!raw) throw new Error("Missing env FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });

  return admin;
}

function getSheetsServiceAccountJson() {
  // 1) Normal JSON env
  let raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT ||
    process.env.GCP_SERVICE_ACCOUNT_JSON ||
    "";

  // 2) Base64 fallback (opcional)
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 || "";
  if (!raw && b64) {
    raw = Buffer.from(b64, "base64").toString("utf8");
  }

  if (!raw) {
    // Debug: SOLO indica si existen, no muestra valores
    return {
      __missing: true,
      present: {
        GOOGLE_SERVICE_ACCOUNT_JSON: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        GOOGLE_SERVICE_ACCOUNT: !!process.env.GOOGLE_SERVICE_ACCOUNT,
        GCP_SERVICE_ACCOUNT_JSON: !!process.env.GCP_SERVICE_ACCOUNT_JSON,
        GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
      },
    } as any;
  }

  // Por si el JSON vino con \n escapados
  raw = raw.replace(/\\n/g, "\n");
  return JSON.parse(raw);
}

export async function GET(req: Request) {
  try {
    // --- Auth (obligatorio si quieres protegerlo) ---
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

    const sa = getSheetsServiceAccountJson();
    if ((sa as any).__missing) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SERVICE_ACCOUNT_JSON", debug: (sa as any).present },
        { status: 500 }
      );
    }

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
