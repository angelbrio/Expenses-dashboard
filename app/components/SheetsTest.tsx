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
    if (!data || !data.ok) {
      return { ingresos: 0, gastos: 0, ahorro: 0, inversion: 0 };
    }

    const values = data.values ?? [];
    if (values.length <= 1) {
      return { ingresos: 0, gastos: 0, ahorro: 0, inversion: 0 };
    }

    // fila 0 = headers, empezamos en 1
    const rows = values.slice(1);

    // Cortar cuando la fila esté completamente vacía
    const effective: any[][] = [];
    for (const r of rows) {
      const isEmpty = (r ?? []).every((cell: any) => String(cell ?? "").trim() === "");
      if (isEmpty) break;
      effective.push(r ?? []);
    }

    // Índices (0-based): A=0, B=1, ...
    const COL = {
      D: 3,  // TOTAL_MENSUAL
      G: 6,  // TOTAL_OCIO
      J: 9,  // TOTAL_TRABAJO
      M: 12, // TOTAL_DEPORTE
      P: 15, // TOTAL_COMIDA
      Y: 24, // TOTAL (NO_CLASIFICADO)
      S: 18, // TOTAL_INGRESOS
      V: 21, // TOTAL_AHORRO
      Z: 25, // INVERSION (tu columna nueva)
    };

    let gastos = 0;
    let ingresos = 0;
    let ahorro = 0;
    let inversion = 0;

    for (const r of effective) {
      gastos +=
        toNumber(r[COL.D]) +
        toNumber(r[COL.G]) +
        toNumber(r[COL.J]) +
        toNumber(r[COL.M]) +
        toNumber(r[COL.P]) +
        toNumber(r[COL.Y]);

      ingresos += toNumber(r[COL.S]);
      ahorro += toNumber(r[COL.V]);
      inversion += toNumber(r[COL.Z]);
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