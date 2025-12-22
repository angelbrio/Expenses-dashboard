"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase.client";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

type ApiResponse =
  | { ok: true; range: string; values: string[][]; uid: string; email?: string | null }
  | { error: string };

export default function SheetsTest() {
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setEmail(u?.email ?? null);
      setUid(u?.uid ?? null);
    });
  }, []);

  async function login() {
    setError(null);
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function logout() {
    setError(null);
    setData(null);
    await signOut(auth);
  }

  async function loadSheet() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No logueado");

      const token = await user.getIdToken();

      const res = await fetch("/api/sheets", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const text = await res.text();
      let json: ApiResponse;

      try {
        json = text ? JSON.parse(text) : ({ error: "Empty response" } as ApiResponse);
      } catch {
        throw new Error("Respuesta no es JSON: " + text);
      }

      if (!res.ok || ("error" in json && json.error)) {
        throw new Error(("error" in json && json.error) ? json.error : `HTTP ${res.status}`);
      }

      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Sheets + Firebase ✅</h1>

      <p>
        <b>Email:</b> {email ?? "—"} <br />
        <b>UID:</b> {uid ?? "—"}
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        {email ? (
          <>
            <button className="border px-4 py-2" onClick={loadSheet} disabled={loading}>
              {loading ? "Cargando..." : "Leer Google Sheet"}
            </button>
            <button className="border px-4 py-2" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <button className="border px-4 py-2" onClick={login}>
            Login con Google
          </button>
        )}
      </div>

      {error && <pre style={{ color: "tomato", marginTop: 16 }}>Error: {error}</pre>}

      {data && "ok" in data && data.ok && (
        <div style={{ marginTop: 16 }}>
          <p>
            <b>Range:</b> {data.range}
          </p>
          <p>
            <b>Primera fila:</b>
          </p>
          <pre>{JSON.stringify(data.values?.[0] ?? [], null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
