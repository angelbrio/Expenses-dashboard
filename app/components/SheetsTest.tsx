"use client";

import { useEffect, useState } from "react";

type ApiResp =
  | { ok: true; spreadsheetId: string; range: string; values: any[][] }
  | { ok?: false; error: string; details?: any };

export default function SheetsTest() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sheets", { cache: "no-store" });
        const text = await res.text();

        let json: ApiResp;
        try {
          json = text ? (JSON.parse(text) as ApiResp) : ({ ok: false, error: "Empty response" } as ApiResp);
        } catch {
          throw new Error("Respuesta no es JSON: " + text);
        }

        if (!res.ok || ("error" in json && json.error)) {
          throw new Error(("error" in json && json.error) ? json.error : `HTTP ${res.status}`);
        }

        setData(json);
      } catch (e: any) {
        setError(e?.message ?? "Error desconocido");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Sheets test ✅</h1>

      {error && <pre style={{ color: "tomato" }}>Error: {error}</pre>}

      {!error && !data && <p>Cargando…</p>}

      {data && "values" in data && (
        <>
          <p><b>Range:</b> {data.range}</p>
          <p><b>Primera fila:</b></p>
          <pre>{JSON.stringify(data.values?.[0] ?? [], null, 2)}</pre>
        </>
      )}
    </main>
  );
}
