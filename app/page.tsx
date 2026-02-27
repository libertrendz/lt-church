/* PATH: app/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setIsAuthed(!!data.session);
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (!ready) {
    return (
      <main style={{ padding: 24 }}>
        <h1 className="h-accent">LT-CHURCH</h1>
        <p style={{ opacity: 0.7 }}>A carregar…</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main style={{ padding: 24 }}>
        <h1 className="h-accent">LT-CHURCH</h1>
        <p style={{ opacity: 0.75 }}>
          É necessário autenticação para aceder à plataforma.
        </p>

        <a
          href="/login"
          className="btn btnAccent"
          style={{ display: "inline-block", marginTop: 14 }}
        >
          Entrar
        </a>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", gap: 22 }}>
      {/* Título */}
      <div>
        <h1 className="h-accent" style={{ fontSize: 36, marginBottom: 8 }}>
          Início
        </h1>
        <p style={{ opacity: 0.75 }}>
          Visão geral e acesso rápido às áreas principais.
        </p>
      </div>

      {/* Cards principais */}
      <div
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
        }}
      >
        <a href="/cultos" className="card cardGlow" style={{ padding: 18, textDecoration: "none", color: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>Cultos & Escalas</h3>
          <p style={{ opacity: 0.75 }}>
            Gerir cultos futuros e equipas atribuídas.
          </p>
        </a>

        <a href="/agenda" className="card" style={{ padding: 18, textDecoration: "none", color: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>Agenda</h3>
          <p style={{ opacity: 0.75 }}>
            Eventos, reuniões e programações.
          </p>
        </a>

        <a href="/membros" className="card" style={{ padding: 18, textDecoration: "none", color: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>Membros</h3>
          <p style={{ opacity: 0.75 }}>
            Gestão de membros e departamentos.
          </p>
        </a>

        <a href="/departamentos" className="card" style={{ padding: 18, textDecoration: "none", color: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>Departamentos</h3>
          <p style={{ opacity: 0.75 }}>
            Estrutura organizacional da igreja.
          </p>
        </a>
      </div>
    </main>
  );
}
