"use client";

import { useState } from "react";

type ApiResp = {
  ok: boolean;
  error?: string;
  values?: string[][];
};

function colToIndex(letter: string) {
  // A=0, B=1 ... Z=25, AA=26...
  let n = 0;
  const s = letter.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

function parseMoney(v: any): number {
  if (v === null || v === undefined) return 0;
  const s = String(v)
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(/\./g, "") // por si metes 1.234,56
    .replace(",", "."); // 123,45 -> 123.45
  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}

function isRowEmpty(row: string[] | undefined, cols: string[]) {
  if (!row) return true;
  return cols.every((c) => {
    const v = row[colToIndex(c)];
    return !v || String(v).trim() === "";
  });
}

function sumColumn(values: string[][], col: string, stopCols: string[]) {
  const idx = colToIndex(col);
  let total = 0;

  // values[0] es header
  for (let r = 1; r < values.length; r++) {
    if (isRowEmpty(values[r], stopCols)) break;
    total += parseMoney(values[r]?.[idx]);
  }
  return total;
}

function sumManyColumnsPerRow(values: string[][], colsToSum: string[], stopCols: string[]) {
  const idxs = colsToSum.map(colToIndex);
  let total = 0;

  for (let r = 1; r < values.length; r++) {
    if (isRowEmpty(values[r], stopCols)) break;

    for (const idx of idxs) {
      total += parseMoney(values[r]?.[idx]);
    }
  }
  return total;
}

export default function SheetsTest() {
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<ApiResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [ahorro, setAhorro] = useState(0);
  const [inversion, setInversion] = useState(0);

  async function readSheet() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sheets", { cache: "no-store" });
      const json: ApiResp = await res.json();

      setRaw(json);

      if (!res.ok || !json?.ok || !json.values?.length) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const values = json.values;

      // ✅ Ajusta aquí SOLO si cambias tu sheet
      // Gastos: columnas con totales por categoría (según tu ejemplo)
      // D = TOTAL_MENSU, G = TOTAL_OCIO, J = TOTAL_TRABAJO, M = TOTAL_DEPORTE, P = TOTAL_COMIDA
      // + W si la usas como total de otra categoría (déjala si existe)
      const GASTOS_TOTAL_COLS = ["D", "G", "J", "M", "P", "W"];

      // Ingresos: tu “total ingresos” suele ser S (porque Q=INGRESOS, R=FECHA, S=TOTAL)
      const INGRESOS_TOTAL_COL = "S";

      // Ahorro: suele ser V (T=AHORRO, U=FECHA, V=TOTAL)
      const AHORRO_TOTAL_COL = "V";

      // Inversión: tú dijiste Z
      const INVERSION_TOTAL_COL = "Z";

      // Para “parar” al llegar a la primera fila sin registros:
      // usa una columna “siempre rellena” cuando hay datos. Normalmente B (MENSUAL) o D (TOTAL_MENSU) funcionan.
      const STOP_COLS = ["B", "D"];

      const totalGastos = sumManyColumnsPerRow(values, GASTOS_TOTAL_COLS, STOP_COLS);
      const totalIngresos = sumColumn(values, INGRESOS_TOTAL_COL, STOP_COLS);
      const totalAhorro = sumColumn(values, AHORRO_TOTAL_COL, STOP_COLS);
      const totalInversion = sumColumn(values, INVERSION_TOTAL_COL, STOP_COLS);

      setGastos(totalGastos);
      setIngresos(totalIngresos);
      setAhorro(totalAhorro);
      setInversion(totalInversion);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const eur = (n: number) =>
    n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>Google Sheets ✅</h1>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          onClick={readSheet}
          style={{ border: "1px solid #999", padding: "8px 12px" }}
          disabled={loading}
        >
          {loading ? "Leyendo..." : "Leer Google Sheet"}
        </button>
      </div>

      <h2 style={{ marginTop: 28 }}>Resumen</h2>
      <div style={{ lineHeight: 2 }}>
        <div><b>Ingresos:</b> {eur(ingresos)}</div>
        <div><b>Gastos:</b> {eur(gastos)}</div>
        <div><b>Ahorro:</b> {eur(ahorro)}</div>
        <div><b>Inversión:</b> {eur(inversion)}</div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {error && <pre style={{ color: "tomato" }}>Error: {error}</pre>}

      {raw && (
        <details>
          <summary>Ver JSON completo</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}