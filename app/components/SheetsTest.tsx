"use client";

import { useState } from "react";

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

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Respuesta no es JSON: " + text);
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Google Sheets Test ✅</h1>

      <button
        onClick={readSheet}
        disabled={loading}
        style={{ border: "1px solid #999", padding: "8px 12px" }}
      >
        Leer Google Sheet
      </button>

      {loading && <p style={{ marginTop: 16 }}>Cargando…</p>}

      {error && (
        <pre style={{ marginTop: 16, color: "tomato" }}>
          Error: {error}
        </pre>
      )}

      {data && (
        <>
          <p><b>Range:</b> {data.range}</p>
          <pre style={{ marginTop: 16 }}>
            {JSON.stringify(data.values?.[0] ?? [], null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}
