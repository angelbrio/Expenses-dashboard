import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function getSheetsServiceAccountJson() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!raw) throw new Error("Missing env GOOGLE_SERVICE_ACCOUNT_JSON");

  // Por si el JSON viene con \n escapados (típico en Vercel env vars)
  const fixed = raw.replace(/\\n/g, "\n");
  return JSON.parse(fixed);
}

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
    if (!spreadsheetId) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID" },
        { status: 500 }
      );
    }

    // IMPORTANTE: traer filas, no solo headers
    // Si no tienes env, por defecto trae A..Z entero
    const range = process.env.GOOGLE_SHEETS_RANGE || "2025!A1:Z";

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