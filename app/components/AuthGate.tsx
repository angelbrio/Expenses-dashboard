"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase.client";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import SheetsTest from "./SheetsTest";

export default function AuthGate() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<typeof auth.currentUser>(null);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  async function login() {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function logout() {
    await signOut(auth);
  }

  if (!ready) return <main style={{ padding: 24 }}>Cargando…</main>;

  if (!user) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Gastos Dashboard</h1>
        <p>Tienes que iniciar sesión para ver tus datos.</p>
        <button className="border px-4 py-2" onClick={login}>
          Login con Google
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <p>
          Logueado como <b>{user.email}</b>
        </p>
        <button className="border px-4 py-2" onClick={logout}>
          Logout
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <SheetsTest />
    </main>
  );
}
