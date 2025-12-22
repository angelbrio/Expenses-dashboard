import { NextResponse } from "next/server";
import { google } from "googleapis";
import admin from "firebase-admin";

export const runtime = "nodejs"; // IMPORTANTÍSIMO en Vercel

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const raw =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || // fallback por si cambiaste el nombre
    "";

  if (!raw) throw new Error("Missing env FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });

  return admin;
}

function getSheetsServiceAccountJson() {
  // soporta varios nombres por si en Vercel lo guardaste distinto
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT ||
    process.env.GCP_SERVICE_ACCOUNT_JSON ||
    "";

  if (!raw) throw new Error("Missing env GOOGLE_SERVICE_ACCOUNT_JSON");
  return JSON.parse(raw);
}

export async function GET(req: Request) {
  try {
    // 1) Auth (opcional pero recomendado)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing Bearer token" }, { status: 401 });
    }

    const fb = getFirebaseAdmin();
    const decoded = await fb.auth().verifyIdToken(token);

    // Si quieres permitir solo tu UID:
    const allowed = process.env.ALLOWED_UID;
    if (allowed && decoded.uid !== allowed) {
      return NextResponse.json({ ok: false, error: "Forbidden (UID not allowed)" }, { status: 403 });
    }

    // 2) Env de Sheets
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
        { ok: false, error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID (o SHEET_ID)" },
        { status: 500 }
      );
    }

    // 3) Google Sheets API
    const sa = getSheetsServiceAccountJson();
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
    // Importante: nunca reventar el build/route por excepción sin controlar
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
