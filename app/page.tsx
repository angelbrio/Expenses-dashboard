"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/sheets");
        const text = await res.text();

        const json = text ? JSON.parse(text) : null;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Error leyendo Sheets");
        }

        setData(json);
      } catch (e: any) {
        setError(e.message);
      }
    }

    load();
  }, []);

  return (
    <main style={{ padding: 32 }}>
      <h1>Sheets test ✅</h1>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {data && (
        <>
          <p><b>Rango:</b> {data.range}</p>
          <p><b>Primera fila:</b></p>
          <pre>{JSON.stringify(data.firstRow, null, 2)}</pre>
        </>
      )}
    </main>
  );
}
