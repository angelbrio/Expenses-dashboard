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
    .replace(/\./g, "") // miles
    .replace(",", "."); // decimales

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function findCol(headers: any[], candidates: string[]): number | null {
  const norm = (x: any) => String(x ?? "").trim().toUpperCase();
  const H = headers.map(norm);

  for (const c of candidates) {
    const idx = H.indexOf(norm(c));
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

  const summary = useMemo(() => {
    if (!data || !data.ok) return { ingresos: 0, gastos: 0, ahorro: 0, inversion: 0 };

    const values = data.values ?? [];
    if (values.length <= 1) return { ingresos: 0, gastos: 0, ahorro: 0, inversion: 0 };

    const headers = values[0] ?? [];
    const rows = values.slice(1);

    // cortar al encontrar una fila totalmente vacía
    const effective: any[][] = [];
    for (const r of rows) {
      const isEmpty = (r ?? []).every((cell: any) => String(cell ?? "").trim() === "");
      if (isEmpty) break;
      effective.push(r ?? []);
    }

    // --- Columnas por header (robusto) ---
    // Gastos: usamos los TOTAL_* de categorías (como ya te funciona)
    const colTotalMensual = findCol(headers, ["TOTAL_MENSUAL", "TOTAL_MENSU"]);
    const colTotalOcio = findCol(headers, ["TOTAL_OCIO"]);
    const colTotalTrabajo = findCol(headers, ["TOTAL_TRABAJO"]);
    const colTotalDeporte = findCol(headers, ["TOTAL_DEPORTE"]);
    const colTotalComida = findCol(headers, ["TOTAL_COMIDA"]);
    const colTotalNoClasificado = findCol(headers, ["TOTAL", "TOTAL_NO_CLASIFICADO"]);

    // Ingresos / Ahorro / Inversión:
    // si existen TOTAL_* los usamos; si no, usamos INGRESOS / AHORRO / INVERSION
    const colTotalIngresos = findCol(headers, ["TOTAL_INGRESOS"]);
    const colIngresos = findCol(headers, ["INGRESOS"]); // en tu caso Q
    const colTotalAhorro = findCol(headers, ["TOTAL_AHORRO"]);
    const colAhorro = findCol(headers, ["AHORRO"]); // en tu caso T
    const colInversion = findCol(headers, ["INVERSION", "INVERSIÓN"]); // tu Z

    let gastos = 0;
    let ingresos = 0;
    let ahorro = 0;
    let inversion = 0;

    for (const r of effective) {
      // Gastos (solo si la columna existe)
      if (colTotalMensual !== null) gastos += toNumber(r[colTotalMensual]);
      if (colTotalOcio !== null) gastos += toNumber(r[colTotalOcio]);
      if (colTotalTrabajo !== null) gastos += toNumber(r[colTotalTrabajo]);
      if (colTotalDeporte !== null) gastos += toNumber(r[colTotalDeporte]);
      if (colTotalComida !== null) gastos += toNumber(r[colTotalComida]);
      if (colTotalNoClasificado !== null) gastos += toNumber(r[colTotalNoClasificado]);

      // Ingresos: preferimos TOTAL_INGRESOS, si no existe usamos INGRESOS
      if (colTotalIngresos !== null) ingresos += toNumber(r[colTotalIngresos]);
      else if (colIngresos !== null) ingresos += toNumber(r[colIngresos]);

      // Ahorro: preferimos TOTAL_AHORRO, si no existe usamos AHORRO
      if (colTotalAhorro !== null) ahorro += toNumber(r[colTotalAhorro]);
      else if (colAhorro !== null) ahorro += toNumber(r[colAhorro]);

      // Inversión
      if (colInversion !== null) inversion += toNumber(r[colInversion]);
    }

    return { ingresos, gastos, ahorro, inversion };
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
      <p><b>Ingresos:</b> {formatEUR(summary.ingresos)}</p>
      <p><b>Gastos:</b> {formatEUR(summary.gastos)}</p>
      <p><b>Ahorro:</b> {formatEUR(summary.ahorro)}</p>
      <p><b>Inversión:</b> {formatEUR(summary.inversion)}</p>

      {loading && <p style={{ marginTop: 16 }}>Cargando...</p>}
      {error && <pre style={{ marginTop: 16, color: "tomato" }}>Error: {error}</pre>}

      {data && (
        <details style={{ marginTop: 16 }}>
          <summary>Ver JSON completo</summary>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}