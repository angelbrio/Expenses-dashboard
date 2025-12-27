import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function getSheetsServiceAccount() {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT ||
    process.env.GCP_SERVICE_ACCOUNT_JSON ||
    "";

  if (!raw) throw new Error("Missing env GOOGLE_SERVICE_ACCOUNT_JSON");

  // Vercel a veces guarda \n como texto; lo convertimos a saltos reales
  const normalized = raw.replace(/\\n/g, "\n");

  return JSON.parse(normalized);
}

export async function GET() {
  try {
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
        {
          ok: false,
          error:
            "Missing spreadsheet id. Set GOOGLE_SHEETS_SPREADSHEET_ID (or SHEET_ID).",
          present: {
            GOOGLE_SHEETS_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            SHEET_ID: !!process.env.SHEET_ID,
          },
        },
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
