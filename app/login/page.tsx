"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setErr(null);

    const e = email.trim();
    if (!e || !password) {
      setBusy(false);
      setErr("Email e palavra-passe são obrigatórios.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password
    });

    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // ✅ Em vez de cair em /meus-dados, cai no menu (home session-aware)
    router.replace("/");
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ marginTop: 0 }}>Entrar</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@exemplo.com"
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "#111",
              color: "#fff"
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Palavra-passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "#111",
              color: "#fff"
            }}
          />
        </label>

        <button
          onClick={login}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #444",
            background: busy ? "#222" : "#111",
            color: "#fff",
            cursor: busy ? "not-allowed" : "pointer"
          }}
        >
          {busy ? "A entrar…" : "Entrar"}
        </button>

        {err ? <p style={{ color: "#ff6b6b", margin: 0 }}>{err}</p> : null}
      </div>
    </main>
  );
}
