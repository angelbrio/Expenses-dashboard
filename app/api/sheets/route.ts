import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getFirebaseAdmin } from "@/lib/firebase.admin";

export const runtime = "nodejs";

function getAuthClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing env GOOGLE_SERVICE_ACCOUNT_JSON");

  const creds = JSON.parse(raw);

  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function GET(req: Request) {
  try {
    // 1) Auth header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    // 2) Verify Firebase token
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(token);

    // 3) Optional allowlist
    const allowed = process.env.ALLOWED_UID;
    if (allowed && decoded.uid !== allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4) Sheet env
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.SHEET_ID;
    const range =
      process.env.GOOGLE_SHEETS_RANGE || process.env.SHEET_RANGE || "2025!A1:Z1";

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Missing env GOOGLE_SHEETS_SPREADSHEET_ID" }, { status: 500 });
    }

    // 5) Read sheet
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      email: decoded.email ?? null,
      range: resp.data.range ?? range,
      values: (resp.data.values ?? []) as string[][],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
