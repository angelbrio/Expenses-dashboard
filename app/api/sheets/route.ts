import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function GET() {
  try {
    const spreadsheetId = getEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
    const range = getEnv("GOOGLE_SHEETS_RANGE");
    const json = getEnv("GOOGLE_SERVICE_ACCOUNT_JSON");

    const credentials = JSON.parse(json);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });

    return NextResponse.json({
      ok: true,
      spreadsheetId,
      range,
      values: resp.data.values ?? [],
    });
  } catch (err: any) {
    // MUY IMPORTANTE: siempre devolver JSON (para evitar “Unexpected end of JSON input”)
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
