import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs"; // importante en Vercel

export async function GET() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE;

  if (!raw || !spreadsheetId || !range) {
    return NextResponse.json(
      { error: "Missing env vars" },
      { status: 500 }
    );
  }

  const creds = JSON.parse(raw);

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return NextResponse.json({
    spreadsheetId,
    range,
    values: resp.data.values ?? [],
  });
}
