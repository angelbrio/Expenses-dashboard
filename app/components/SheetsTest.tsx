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
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Error");
        }

        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Google Sheets ✅</h1>

      {loading && <p>Cargando…</p>}

      {error && <pre style={{ color: "tomato" }}>{error}</pre>}

      {data && (
        <pre>{JSON.stringify(data.values, null, 2)}</pre>
      )}
    </main>
  );
}
