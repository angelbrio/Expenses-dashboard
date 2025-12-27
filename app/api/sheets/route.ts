import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function extractServiceAccount(raw: string) {
  // client_email
  const emailMatch = raw.match(/"client_email"\s*:\s*"([^"]+)"/);
  const client_email = emailMatch?.[1];

  // private_key (captura aunque tenga saltos de línea reales dentro)
  const keyMatch = raw.match(/"private_key"\s*:\s*"([\s\S]*?)"/);
  let private_key = keyMatch?.[1];

  if (!client_email || !private_key) {
    // Diagnóstico seguro (sin imprimir secretos)
    const hasCR = raw.includes("\r");
    const hasLF = raw.includes("\n");
    const hasTAB = raw.includes("\t");
    throw new Error(
      `Cannot extract client_email/private_key from GOOGLE_SERVICE_ACCOUNT_JSON. (raw hasCR=${hasCR} hasLF=${hasLF} hasTAB=${hasTAB})`
    );
  }

  // Si viene con \n escapados -> convertir a saltos reales
  private_key = private_key.replace(/\\n/g, "\n");
  // Normaliza CRLF
  private_key = private_key.replace(/\r\n/g, "\n");

  return { client_email, private_key };
}

export async function GET() {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SERVICE_ACCOUNT_JSON" },
        { status: 500 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
    const range = process.env.GOOGLE_SHEETS_RANGE || "2025!A1:Z1";

    if (!spreadsheetId) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID" },
        { status: 500 }
      );
    }

    const sa = extractServiceAccount(raw);

    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });

    return NextResponse.json({
      ok: true,
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
