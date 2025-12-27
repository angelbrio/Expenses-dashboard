import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

export async function GET() {
  try {
    const spreadsheetId = process.env.SHEET_ID;
    const range = process.env.SHEET_RANGE || "A1:Z10";
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!spreadsheetId) {
      return NextResponse.json({ ok: false, error: "Missing SHEET_ID" }, { status: 500 });
    }

    if (!raw) {
      return NextResponse.json({ ok: false, error: "Missing GOOGLE_SERVICE_ACCOUNT_JSON" }, { status: 500 });
    }

    const sa = JSON.parse(raw);

    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return NextResponse.json({
      ok: true,
      spreadsheetId,
      range,
      values: res.data.values ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
