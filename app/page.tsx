/* PATH: app/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";

function Card({
  title,
  desc,
  href
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        border: "1px solid #2a2a2a",
        background: "#0b0b0b",
        borderRadius: 18,
        padding: 16,
        color: "#fff",
        textDecoration: "none"
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
      <div style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.35 }}>{desc}</div>
    </a>
  );
}

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setIsAuthed(false);
        setReady(true);
        return;
      }

      setIsAuthed(!!data.session);
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main style={{ padding: 6 }}>
        <h1 style={{ marginTop: 4, marginBottom: 6 }}>Início</h1>
        <p style={{ opacity: 0.85 }}>A carregar…</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main style={{ padding: 6 }}>
        <h1 style={{ marginTop: 4, marginBottom: 6 }}>LTZ-CHURCH</h1>
        <p style={{ opacity: 0.85 }}>
          Precisas de autenticação para aceder ao app.
        </p>

        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #444",
            background: "#111",
            color: "#fff",
            textDecoration: "none"
          }}
        >
          Entrar
        </a>
      </main>
    );
  }

  return (
    <main style={{ padding: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginTop: 4, marginBottom: 6 }}>Início</h1>
          <p style={{ opacity: 0.85, marginTop: 0 }}>
            Acesso rápido ao operacional. Sem ecrãs técnicos.
          </p>
        </div>

        <button
          onClick={logout}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #444",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            height: "fit-content"
          }}
        >
          Sair
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
        }}
      >
        <Card
          title="Cultos & Escalas"
          desc="Ver próximos cultos e gerir equipas por função."
          href="/cultos"
        />
        <Card
          title="Agenda"
          desc="Criar e consultar eventos (avulsos e recorrentes)."
          href="/agenda"
        />
        <Card
          title="Membros"
          desc="Gerir membros e (mais tarde) cadastro completo."
          href="/membros"
        />
        <Card
          title="Departamentos"
          desc="Gerir departamentos e associações."
          href="/departamentos"
        />
        <Card
          title="Funções"
          desc="Gerir funções (Receção, Projeção, Transmissão…) e inativar quando necessário."
          href="/funcoes"
        />
        <Card
          title="Perfil"
          desc="Os teus dados técnicos e validação de acesso."
          href="/me"
        />
      </div>

      <div style={{ marginTop: 18, padding: 14, borderRadius: 16, border: "1px solid #2a2a2a", background: "#0b0b0b" }}>
        <div style={{ fontWeight: 900 }}>Configuração (admin)</div>
        <div style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.35 }}>
          Por agora, mantemos estas páginas fora do menu principal para não poluir a operação:
        </div>
        <ul style={{ marginTop: 10, marginBottom: 0, opacity: 0.9, lineHeight: 1.6 }}>
          <li><a href="/congregacoes" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>Congregações</a></li>
          <li><a href="/atividades" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>Tipos de evento (Atividades)</a></li>
          <li><a href="/agenda/series" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>Recorrências (Séries)</a></li>
        </ul>
      </div>
    </main>
  );
}