import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs"; // importante en Vercel

export async function GET() {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const sheetId = process.env.SHEET_ID;
    const range = process.env.SHEET_RANGE || "Hoja 1!A1:Z1";

    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Missing env GOOGLE_SERVICE_ACCOUNT_JSON" },
        { status: 500 }
      );
    }
    if (!sheetId) {
      return NextResponse.json(
        { ok: false, error: "Missing env SHEET_ID" },
        { status: 500 }
      );
    }

    // Si lo guardaste minificado en 1 línea en Vercel, esto debería parsear bien
    const creds = JSON.parse(raw);

    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const values = res.data.values ?? [];
    const firstRow = values[0] ?? [];

    return NextResponse.json({
      ok: true,
      range,
      firstRow,
      rawValues: values,
    });
  } catch (err: any) {
    // MUY importante: devolver JSON siempre
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || String(err),
        name: err?.name,
      },
      { status: 500 }
    );
  }
}
