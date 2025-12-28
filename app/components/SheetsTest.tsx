"use client";

import { useEffect, useMemo, useState } from "react";

type ApiOk = {
  ok: true;
  values: any[][];
  range?: string;
  spreadsheetId?: string;
};

type ApiErr = {
  ok: false;
  error: string;
};

function toNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;

  // Soporta "18", "18.5", "18,5", "1.234,56", "1,234.56"
  // Normalizamos a formato JS (.)
  const normalized = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // quita separador miles "." si aplica
    .replace(/,(?=\d{3}(\D|$))/g, "") // quita separador miles "," si aplica
    .replace(",", "."); // coma decimal -> punto

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function isRowEmpty(row: any[]): boolean {
  // "fila vacía" = todas las celdas vacías
  return row.every((c) => String(c ?? "").trim() === "");
}

// Convierte letra Excel a índice: A=0, B=1, ..., Z=25, AA=26...
function colLetterToIndex(letter: string): number {
  const s = letter.trim().toUpperCase();
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

export default function SheetsTest() {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [values, setValues] = useState<any[][]>([]);

  async function load() {
    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/sheets", { cache: "no-store" });
      const json = (await res.json()) as ApiOk | ApiErr;

      if (!res.ok || !json.ok) {
        throw new Error((json as ApiErr).error || `HTTP ${res.status}`);
      }

      setValues((json as ApiOk).values ?? []);
    } catch (e: any) {
      setApiError(e?.message || "Error");
      setValues([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const computed = useMemo(() => {
    if (!values?.length) {
      return {
        ingresos: 0,
        ahorro: 0,
        gastosByCat: {} as Record<string, number>,
        totalGastos: 0,
        balance: 0,
        rowsUsed: 0,
      };
    }

    const headers = values[0] ?? [];
    const rows = (values.slice(1) ?? []) as any[][];

    // Tus columnas (según lo que has dicho)
    const COL_INGRESOS = colLetterToIndex("Q");
    const COL_AHORRO = colLetterToIndex("T");

    // Gastos por categoría: D, G, J, M, W
    const gastoCols = [
      { key: "MENSUAL", idx: colLetterToIndex("D") },
      { key: "OCIO", idx: colLetterToIndex("G") },
      { key: "TRABAJO", idx: colLetterToIndex("J") },
      { key: "DEPORTE", idx: colLetterToIndex("M") },
      { key: "OTROS", idx: colLetterToIndex("W") },
    ];

    let ingresos = 0;
    let ahorro = 0;
    const gastosByCat: Record<string, number> = {};
    for (const g of gastoCols) gastosByCat[g.key] = 0;

    let rowsUsed = 0;

    for (const row of rows) {
      if (!row || isRowEmpty(row)) break; // 👈 tu regla: al encontrar fila vacía, paramos

      rowsUsed++;

      ingresos += toNumber(row[COL_INGRESOS]);
      ahorro += toNumber(row[COL_AHORRO]);

      for (const g of gastoCols) {
        gastosByCat[g.key] += toNumber(row[g.idx]);
      }
    }

    const totalGastos = Object.values(gastosByCat).reduce((a, b) => a + b, 0);
    const balance = ingresos - totalGastos;

    return { ingresos, ahorro, gastosByCat, totalGastos, balance, rowsUsed };
  }, [values]);

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Google Sheets ✅</h1>
        <button
          onClick={load}
          disabled={loading}
          style={{ border: "1px solid #999", padding: "8px 12px", cursor: "pointer" }}
        >
          {loading ? "Cargando..." : "Recargar"}
        </button>
      </div>

      {apiError && (
        <pre style={{ marginTop: 16, color: "tomato" }}>
          {apiError}
        </pre>
      )}

      {!apiError && (
        <>
          {/* INGRESOS centrado */}
          <section
            style={{
              marginTop: 24,
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.8 }}>INGRESOS</div>
            <div style={{ fontSize: 40, fontWeight: 800, marginTop: 6 }}>
              {computed.ingresos.toFixed(2)} €
            </div>
            <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
              Filas contadas: {computed.rowsUsed}
            </div>
          </section>

          {/* Ahorro + resumen */}
          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
              <div style={{ fontSize: 14, opacity: 0.8 }}>AHORRO</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
                {computed.ahorro.toFixed(2)} €
              </div>
            </div>

            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
              <div style={{ fontSize: 14, opacity: 0.8 }}>BALANCE</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
                {computed.balance.toFixed(2)} €
              </div>
              <div style={{ marginTop: 8, opacity: 0.8 }}>
                Total gastos: <b>{computed.totalGastos.toFixed(2)} €</b>
              </div>
            </div>
          </section>

          {/* Gastos por categoría */}
          <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 10 }}>GASTOS (por categoría)</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Object.entries(computed.gastosByCat).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 10,
                    border: "1px solid #eee",
                    borderRadius: 10,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{k}</span>
                  <span>{v.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
