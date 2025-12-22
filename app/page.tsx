"use client";

import SheetsTest from "./components/SheetsTest";

export default function Home() {
  return <SheetsTest />;
}

import { useEffect, useState } from "react";

import SheetsTest from "./components/SheetsTest";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sheets")
      .then(async (r) => {
        const t = await r.text();
        try { return JSON.parse(t); } catch { throw new Error(t); }
      })
      .then(setData)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Sheets test ✅</h1>
      {err && <pre style={{ color: "red" }}>Error: {err}</pre>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
