"use client";

import { useEffect, useState } from "react";

export default function SheetsTest() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sheets", { cache: "no-store" });
        const text = await res.text();

        let json: any;
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
        setError(e?.message || "Error");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Google Sheets ✅</h1>

      {error && <pre style={{ color: "tomato" }}>{error}</pre>}

      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
