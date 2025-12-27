export const dynamic = "force-dynamic";

async function getData() {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${base}/api/sheets`, { cache: "no-store" });
  const text = await res.text();

  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, raw: text };
  }
}

export default async function Page() {
  const data = await getData();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Google Sheets ✅</h1>
      <pre style={{ marginTop: 16 }}>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
