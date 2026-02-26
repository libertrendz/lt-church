/* PATH: app/login/page.tsx */
"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setErrorMsg(null);
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // ✅ Hard redirect para evitar glitches/hydration no App Router
      window.location.href = "/";
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro inesperado ao entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 18 }}>
      <h1 style={{ fontSize: 44, margin: "18px 0 10px" }}>Entrar</h1>

      <form onSubmit={onSubmit} className="card" style={{ padding: 18, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800, color: "rgba(255,255,255,.85)" }}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="teu@email.com"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.16)",
              background: "#0b0b0b",
              color: "#fff",
              outline: "none"
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800, color: "rgba(255,255,255,.85)" }}>Palavra-passe</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.16)",
              background: "#0b0b0b",
              color: "#fff",
              outline: "none"
            }}
          />
        </label>

        {errorMsg ? (
          <div
            style={{
              border: "1px solid rgba(255,120,120,.35)",
              background: "rgba(255,120,120,.08)",
              borderRadius: 12,
              padding: 10,
              color: "rgba(255,220,220,.95)",
              fontWeight: 700
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <button type="submit" className="btn btnAccent" disabled={busy} style={{ width: "100%" }}>
          {busy ? "A entrar…" : "Entrar"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
          Se tiveres problemas, confirma que o utilizador existe no Auth e que a palavra-passe está correcta.
        </div>
      </form>
    </main>
  );
}
