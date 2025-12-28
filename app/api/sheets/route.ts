import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function parseServiceAccount(raw: string) {
  const input = (raw ?? "").trim().replace(/\r/g, "");

  // 1) Intento normal: JSON válido
  try {
    const obj = JSON.parse(input);
    if (obj?.private_key && typeof obj.private_key === "string") {
      obj.private_key = obj.private_key.replace(/\\n/g, "\n");
    }
    return obj;
  } catch {
    // 2) Fallback: Vercel a veces mete saltos de línea reales dentro de private_key (JSON inválido)
    const clientEmail =
      input.match(/"client_email"\s*:\s*"([^"]+)"/)?.[1] ?? null;

    const pkRaw =
      input.match(/"private_key"\s*:\s*"([\s\S]*?)"\s*,\s*"/)?.[1] ?? null;

    if (!clientEmail || !pkRaw) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON inválido. Asegúrate de pegar el JSON completo."
      );
    }

    const privateKey = pkRaw.replace(/\\n/g, "\n"); // por si venía escapado
    return { client_email: clientEmail, private_key: privateKey };
  }
}

export async function GET() {
  try {
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      process.env.SHEET_ID ||
      "";

    const range =
      process.env.GOOGLE_SHEETS_RANGE || process.env.SHEET_RANGE || "2025!A1:Z";

    if (!spreadsheetId) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID (or SHEET_ID)" },
        { status: 500 }
      );
    }

    const rawSa = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
    if (!rawSa) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SERVICE_ACCOUNT_JSON" },
        { status: 500 }
      );
    }

    const sa = parseServiceAccount(rawSa);

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