import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function GET() {
  try {
    const spreadsheetId = mustGetEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
    const range = process.env.GOOGLE_SHEETS_RANGE || "2025!A1:Z1";

    // JSON en una sola línea, con \n escapados
    const raw = mustGetEnv("GOOGLE_SERVICE_ACCOUNT_JSON");
    const fixed = raw.replace(/\\n/g, "\n");
    const sa = JSON.parse(fixed);

    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return NextResponse.json({
      ok: true,
      spreadsheetId,
      range,
      values: resp.data.values ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Unknown error" },
      { status: 500 }
    );
  }
}
