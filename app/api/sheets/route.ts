import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

export async function GET() {
  const SHEET_ID = process.env.SHEET_ID;
  const RANGE = process.env.SHEET_RANGE || "2025!A1:Z1";
  const JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!SHEET_ID) return NextResponse.json({ error: "Missing env SHEET_ID" }, { status: 500 });
  if (!JSON_RAW) return NextResponse.json({ error: "Missing env GOOGLE_SERVICE_ACCOUNT_JSON" }, { status: 500 });

  const creds = JSON.parse(JSON_RAW);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE });

  return NextResponse.json({
    range: resp.data.range,
    values: resp.data.values ?? [],
  });
}
