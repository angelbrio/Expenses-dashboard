"use client";

import { useState } from "react";

function colIndex(headers: string[], name: string) {
  return headers.indexOf(name);
}

function sumColumn(rows: string[][], index: number): number {
  if (index < 0) return 0;

  let sum = 0;

  for (const row of rows) {
    const value = row[index];

    // regla: cuando está vacío, dejamos de contar
    if (!value || value.trim() === "") break;

    // soporta "12", "12.5", y también "12,5"
    const num = Number(value.replace(",", "."));
    if (!Number.isNaN(num)) sum += num;
  }

  return sum;
}

function sumMultipleColumns(
  rows: string[][],
  headers: string[],
  columnNames: string[]
): number {
  return columnNames.reduce((acc, name) => {
    const idx = colIndex(headers, name);
    return acc + sumColumn(rows, idx);
  }, 0);
}

export default function SheetsTest() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function readSheet() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/sheets", { cache: "no-store" });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  // --- cálculos (solo si hay data) ---
  let totalIngresos = 0;
  let totalAhorro = 0;
  let totalGastos = 0;

  if (data?.values?.length >= 2) {
    const values: string[][] = data.values;
    const headers = values[0];
    const rows = values.slice(1);

    totalIngresos = sumColumn(rows, colIndex(headers, "TOTAL_INGRESOS"));
    totalAhorro = sumColumn(rows, colIndex(headers, "TOTAL_AHORRO"));

    totalGastos = sumMultipleColumns(rows, headers, [
      "TOTAL_MENSUAL",
      "TOTAL_OCIO",
      "TOTAL_TRABAJO",
      "TOTAL_DEPORTE",
      "TOTAL_COMIDA",
      "TOTAL_NO_CLASIFICADO",
    ]);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Google Sheets ✅</h1>

      <button
        onClick={readSheet}
        style={{ border: "1px solid #999", padding: "8px 12px" }}
        disabled={loading}
      >
        {loading ? "Cargando..." : "Leer Google Sheet"}
      </button>

      {error && (
        <pre style={{ marginTop: 16, color: "tomato" }}>Error: {error}</pre>
      )}

      {data && (
        <div style={{ marginTop: 24 }}>
          <h2>Resumen</h2>
          <p>
            <b>Ingresos:</b> {totalIngresos} €
          </p>
          <p>
            <b>Gastos:</b> {totalGastos} €
          </p>
          <p>
            <b>Ahorro:</b> {totalAhorro} €
          </p>

          <hr style={{ margin: "16px 0" }} />

          <details>
            <summary>Ver JSON completo</summary>
            <pre style={{ marginTop: 12 }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </main>
  );
}