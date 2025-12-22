"use client";

import { useEffect, useState } from "react";

type ApiResp = {
  values?: string[][];
  error?: string;
  range?: string;
};

export default function Home() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sheets", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((e) => setData({ error: String(e) }))
      .finally(() => setLoading(false));
  }, []);

  const row = data?.values?.[0] ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sheets test ✅</h1>

      {loading && <p>Cargando…</p>}

      {data?.error && (
        <p className="text-red-600">
          Error: <b>{data.error}</b>
        </p>
      )}

      {!loading && !data?.error && (
        <>
          <p className="text-sm text-gray-500">
            Range: <code>{data?.range}</code>
          </p>

          {row.length === 0 ? (
            <p>No hay datos en ese rango.</p>
          ) : (
            <div className="rounded border p-4">
              <p className="font-medium mb-2">Primera fila:</p>
              <ul className="list-disc pl-6">
                {row.map((cell, i) => (
                  <li key={i}>
                    <span className="text-gray-500">[{i}]</span> {cell}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="rounded border p-4">
            <summary className="cursor-pointer font-medium">
              Ver respuesta completa (debug)
            </summary>
            <pre className="mt-3 text-xs overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </main>
  );
}
