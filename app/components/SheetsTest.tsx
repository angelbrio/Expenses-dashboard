"use client";

import { useState } from "react";

type ApiResponse = {
  ok: boolean;
  values?: string[][];
  error?: string;
};

function parseAmount(v: unknown): number {
  if (v == null) return 0;
  const s = String(v)
    .trim()
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "") // miles "1.234" -> "1234"
    .replace(/,/g, "."); // decimales "12,34" -> "12.34"

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function buildIndexMap(header: string[]) {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = (h ?? "").trim().toUpperCase();
    if (key) idx[key] = i;
  });
  return idx;
}

function sumColumn(rows: string[][], colIndex: number) {
  if (colIndex == null || colIndex < 0) return 0;
  let sum = 0;

  for (const r of rows) {
    // si la fila está completamente vacía, paramos (tu regla)
    const allEmpty = r.every((c) => !String(c ?? "").trim());
    if (allEmpty) break;

    sum += parseAmount(r[colIndex]);
  }
  return sum;
}

function sumExpensesByTotals(header: string[], rows: string[][]) {
  const upper = header.map((h) => (h ?? "").trim().toUpperCase());

  // Gastos = suma de todas las columnas que empiezan por TOTAL_
  // excepto ingresos/ahorro/inversion
  const expenseTotalCols = upper
    .map((h, i) => ({ h, i }))
    .filter(
      ({ h }) =>
        h.startsWith("TOTAL_") &&
        h !== "TOTAL_INGRESOS" &&
        h !== "TOTAL_AHORRO" &&
        h !== "TOTAL_INVERSION"
    )
    .map(({ i }) => i);

  let sum = 0;
  for (const r of rows) {
    const allEmpty = r.every((c) => !String(c ?? "").trim());
    if (allEmpty) break;

    for (const i of expenseTotalCols) sum += parseAmount(r[i]);
  }
  return sum;
}

export default function SheetsTest() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readSheet() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/sheets", { cache: "no-store" });
      const text = await res.text();
      const json = text ? (JSON.parse(text) as ApiResponse) : null;

      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const values = data?.values ?? [];
  const header = values[0] ?? [];
  const rows = values.slice(1);

  const idx = buildIndexMap(header);

  const ingresos =
    idx["TOTAL_INGRESOS"] != null
      ? sumColumn(rows, idx["TOTAL_INGRESOS"])
      : idx["INGRESOS"] != null
      ? sumColumn(rows, idx["INGRESOS"])
      : 0;

  const ahorro =
    idx["TOTAL_AHORRO"] != null
      ? sumColumn(rows, idx["TOTAL_AHORRO"])
      : idx["AHORRO"] != null
      ? sumColumn(rows, idx["AHORRO"])
      : 0;

  // Inversión: soporta "TOTAL_INVERSION" o "INVERSION"
  const inversion =
    idx["TOTAL_INVERSION"] != null
      ? sumColumn(rows, idx["TOTAL_INVERSION"])
      : idx["INVERSION"] != null
      ? sumColumn(rows, idx["INVERSION"])
      : 0;

  const gastos = sumExpensesByTotals(header, rows);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>Google Sheets ✅</h1>

      <div style={{ textAlign: "center", margin: "12px 0" }}>
        <button onClick={readSheet} style={{ border: "1px solid #999", padding: "8px 12px" }}>
          Leer Google Sheet
        </button>
      </div>

      {loading && <p style={{ textAlign: "center" }}>Cargando...</p>}
      {error && <pre style={{ color: "tomato" }}>Error: {error}</pre>}

      <h2>Resumen</h2>
      <p>
        <b>Ingresos:</b> {formatEUR(ingresos)}
      </p>
      <p>
        <b>Gastos:</b> {formatEUR(gastos)}
      </p>
      <p>
        <b>Ahorro:</b> {formatEUR(ahorro)}
      </p>
      <p>
        <b>Inversión:</b> {formatEUR(inversion)}
      </p>

      <hr style={{ margin: "16px 0" }} />

      <details>
        <summary style={{ cursor: "pointer" }}>Ver JSON completo</summary>
        <pre style={{ marginTop: 12 }}>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </main>
  );
}