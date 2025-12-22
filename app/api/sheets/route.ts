import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing env GOOGLE_SERVICE_ACCOUNT_JSON");

  // Soporta JSON directo o Base64 (por si algún día prefieres base64)
  const maybeJson = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  const sa = JSON.parse(maybeJson);

  // Asegura que la private_key tenga saltos correctos
  if (typeof sa.private_key === "string") {
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  }

  return sa;
}

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE;

    if (!spreadsheetId) {
      return NextResponse.json({ ok: false, error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID" }, { status: 500 });
    }
    if (!range) {
      return NextResponse.json({ ok: false, error: "Missing env GOOGLE_SHEETS_RANGE" }, { status: 500 });
    }

    const sa = getServiceAccount();

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
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
