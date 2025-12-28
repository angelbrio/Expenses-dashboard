"use client";

import { useMemo, useState } from "react";

type ApiResp =
  | { ok: true; values: any[][]; range: string; spreadsheetId: string }
  | { ok: false; error: string };

function toNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;

  const s = String(v).trim();
  if (!s) return 0;

  // soporta: "12", "12.5", "12,5", "12 €", "1.234,56"
  const normalized = s
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

// Normaliza para comparar headers (sin tildes, trim, uppercase)
function normHeader(x: any) {
  return String(x ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos
}

function findCol(headers: any[], candidates: string[]): number | null {
  const H = headers.map(normHeader);
  for (const c of candidates) {
    const idx = H.indexOf(normHeader(c));
    if (idx !== -1) return idx;
  }
  return null;
}

export default function SheetsTest() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readSheet() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/sheets", { cache: "no-store" });
      const text = await res.text();

      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Respuesta no-JSON: ${text.slice(0, 200)}`);
      }

      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const { ingresos, gastos, ahorro, inversion, patrimonio, notificaciones } = useMemo(() => {
    const empty = {
      ingresos: 0,
      gastos: 0,
      ahorro: 0,
      inversion: 0,
      patrimonio: 0,
      notificaciones: [] as { w: string; x: string; y: string }[],
    };

    if (!data || !data.ok) return empty;

    const values = data.values ?? [];
    if (values.length <= 1) return empty;

    const headers = values[0] ?? [];
    const rows = values.slice(1);

    // cortar al encontrar una fila totalmente vacía
    const effective: any[][] = [];
    for (const r of rows) {
      const isEmpty = (r ?? []).every((cell: any) => String(cell ?? "").trim() === "");
      if (isEmpty) break;
      effective.push(r ?? []);
    }

    // --- gastos: TOTAL_* ---
    const colTotalMensual = findCol(headers, ["TOTAL_MENSUAL", "TOTAL_MENSU"]);
    const colTotalOcio = findCol(headers, ["TOTAL_OCIO"]);
    const colTotalTrabajo = findCol(headers, ["TOTAL_TRABAJO"]);
    const colTotalDeporte = findCol(headers, ["TOTAL_DEPORTE"]);
    const colTotalComida = findCol(headers, ["TOTAL_COMIDA"]);
    const colTotalNoClasificado = findCol(headers, ["TOTAL_NO_CLASIFICADO", "TOTAL"]);

    // --- ingresos/ahorro/inversion ---
    const colTotalIngresos = findCol(headers, ["TOTAL_INGRESOS"]);
    const colIngresos = findCol(headers, ["INGRESOS"]);

    const colTotalAhorro = findCol(headers, ["TOTAL_AHORRO"]);
    const colAhorro = findCol(headers, ["AHORRO"]);

    // inversión: soporta INVERSION / INVERSIÓN
    const colInversion = findCol(headers, ["INVERSION", "INVERSIÓN"]);

    // Notificaciones SC: columnas W, X, Y (por letra)
    const idxW = 22; // W (0-based)
    const idxX = 23; // X
    const idxY = 24; // Y

    let _gastos = 0;
    let _ingresos = 0;
    let _ahorro = 0;
    let _inversion = 0;

    const _notifs: { w: string; x: string; y: string }[] = [];

    for (const r of effective) {
      // gastos
      if (colTotalMensual !== null) _gastos += toNumber(r[colTotalMensual]);
      if (colTotalOcio !== null) _gastos += toNumber(r[colTotalOcio]);
      if (colTotalTrabajo !== null) _gastos += toNumber(r[colTotalTrabajo]);
      if (colTotalDeporte !== null) _gastos += toNumber(r[colTotalDeporte]);
      if (colTotalComida !== null) _gastos += toNumber(r[colTotalComida]);
      if (colTotalNoClasificado !== null) _gastos += toNumber(r[colTotalNoClasificado]);

      // ingresos
      if (colTotalIngresos !== null) _ingresos += toNumber(r[colTotalIngresos]);
      else if (colIngresos !== null) _ingresos += toNumber(r[colIngresos]);

      // ahorro
      if (colTotalAhorro !== null) _ahorro += toNumber(r[colTotalAhorro]);
      else if (colAhorro !== null) _ahorro += toNumber(r[colAhorro]);

      // inversion
      if (colInversion !== null) _inversion += toNumber(r[colInversion]);

      // notificaciones (W/X/Y)
      const w = String(r[idxW] ?? "").trim();
      const x = String(r[idxX] ?? "").trim();
      const y = String(r[idxY] ?? "").trim();
      if (w || x || y) _notifs.push({ w, x, y });
    }

    return {
      ingresos: _ingresos,
      gastos: _gastos,
      ahorro: _ahorro,
      inversion: _inversion,
      patrimonio: _ingresos - _gastos,
      notificaciones: _notifs,
    };
  }, [data]);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>Google Sheets ✅</h1>

      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
        <button onClick={readSheet} style={{ border: "1px solid #999", padding: "8px 12px" }}>
          Leer Google Sheet
        </button>
      </div>

      <h2>Resumen</h2>
      <p><b>Ingresos:</b> {formatEUR(ingresos)}</p>
      <p><b>Gastos:</b> {formatEUR(gastos)}</p>
      <p><b>Ahorro:</b> {formatEUR(ahorro)}</p>
      <p><b>Inversión:</b> {formatEUR(inversion)}</p>
      <p><b>Patrimonio:</b> {formatEUR(patrimonio)}</p>

      {loading && <p style={{ marginTop: 16 }}>Cargando...</p>}
      {error && <pre style={{ marginTop: 16, color: "tomato" }}>Error: {error}</pre>}

      <div
        style={{
          marginTop: 20,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          background: "#fafafa",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Notificaciones SC</h3>

        {notificaciones.length === 0 ? (
          <p style={{ margin: 0, color: "#666" }}>Sin notificaciones.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {notificaciones.map((n, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  background: "white",
                }}
              >
                <div><b>W:</b> {n.w || "—"}</div>
                <div><b>X:</b> {n.x || "—"}</div>
                <div><b>Y:</b> {n.y || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}