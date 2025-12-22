"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase.client";

export default function SheetsTest() {
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setEmail(u?.email ?? null);
      setUid(u?.uid ?? null);
    });
  }, []);

  async function login() {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function logout() {
    await signOut(auth);
    setData(null);
    setError(null);
  }

  async function readSheet() {
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
      const json = text ? JSON.parse(text) : null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Sheets + Firebase ✅</h1>

      {email ? (
        <>
          <p><b>Email:</b> {email}</p>
          <p><b>UID:</b> {uid}</p>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={readSheet} style={{ border: "1px solid #999", padding: "8px 12px" }}>
              Leer Google Sheet
            </button>
            <button onClick={logout} style={{ border: "1px solid #999", padding: "8px 12px" }}>
              Logout
            </button>
          </div>
        </>
      ) : (
        <button onClick={login} style={{ border: "1px solid #999", padding: "8px 12px" }}>
          Login con Google
        </button>
      )}

      {loading && <p style={{ marginTop: 16 }}>Cargando...</p>}

      {error && <pre style={{ marginTop: 16, color: "tomato" }}>Error: {error}</pre>}

      {data && <pre style={{ marginTop: 16 }}>{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
