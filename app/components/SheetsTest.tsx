"use client";

import { useEffect, useState } from "react";

export default function SheetsTest() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sheets", { cache: "no-store" });
        const text = await res.text();

        let json: any;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          throw new Error(`Respuesta no es JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
        }

        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setData(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Sheets test ✅</h1>
      {loading && <p>Cargando...</p>}
      {error && <pre style={{ color: "tomato" }}>Error: {error}</pre>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
