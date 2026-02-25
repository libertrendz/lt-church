/* PATH: app/components/AppHeader.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/cultos", label: "Cultos & Escalas" },
  { href: "/agenda", label: "Agenda" },
  { href: "/membros", label: "Membros" },
  { href: "/departamentos", label: "Departamentos" },
  { href: "/funcoes", label: "Funções" },
  { href: "/definicoes/aparencia", label: "Aparência" },
  { href: "/me", label: "Perfil" }
];

function Hamburger({ open }: { open: boolean }) {
  const line: React.CSSProperties = {
    height: 2,
    width: 18,
    background: "rgba(255,255,255,.92)",
    borderRadius: 99,
    transition: "transform .15s ease, opacity .15s ease"
  };

  return (
    <div style={{ width: 22, height: 18, display: "grid", alignContent: "center", gap: 4 }}>
      <span style={{ ...line, transform: open ? "translateY(6px) rotate(45deg)" : "none" }} />
      <span style={{ ...line, opacity: open ? 0 : 1 }} />
      <span style={{ ...line, transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }} />
    </div>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [open, setOpen] = useState(false);
  const [tenantNome, setTenantNome] = useState<string | null>(null);

  // Não mostrar header no login
  if (pathname?.startsWith("/login")) return null;

  // Fecha drawer ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bloquear scroll quando drawer aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Carregar nome da igreja (tenant)
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const cached = localStorage.getItem("ltz_tenant_nome");
        if (cached && active) setTenantNome(cached);

        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user?.id;
        if (!userId) return;

        const uRes = await supabase.from("usuarios").select("igreja_id").eq("id", userId).single();
        if (uRes.error) return;

        const igrejaId = (uRes.data?.igreja_id as string | null) || null;
        if (!igrejaId) return;

        const iRes = await supabase.from("igrejas").select("nome").eq("id", igrejaId).single();
        if (iRes.error) return;

        const nome = (iRes.data?.nome as string | null) || null;
        if (!active) return;

        setTenantNome(nome);
        if (nome) localStorage.setItem("ltz_tenant_nome", nome);
      } catch {
        // silencioso
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(5,5,5,0.92)",
        borderBottom: "1px solid #222",
        backdropFilter: "blur(10px)"
      }}
    >
      <nav
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        {/* Brand */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", minWidth: 0 }}>
          <img
            src="/images/logo_oficial_church.png"
            alt="LTZ-CHURCH"
            width={64}
            height={64}
            style={{ borderRadius: 14, display: "block" }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 950, letterSpacing: 0.2, lineHeight: 1.1 }}>
              LTZ-CHURCH
            </div>
            <div style={{ color: "rgba(255,255,255,.72)", fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>
              {tenantNome ? tenantNome : "—"}
            </div>
          </div>
        </a>

        <span style={{ flex: 1 }} />

        {/* Desktop nav */}
        <div className="navDesktop" style={{ display: "none", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="navlink"
              style={{
                textDecoration: "none",
                opacity: isActive(item.href) ? 1 : 0.9,
                fontWeight: isActive(item.href) ? 900 : 800,
                borderBottom: isActive(item.href) ? "2px solid var(--accent)" : "2px solid transparent",
                paddingBottom: 6
              }}
            >
              {item.label}
            </a>
          ))}

          <button onClick={logout} className="btn" style={{ padding: "8px 10px", borderRadius: 12 }}>
            Sair
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="navMobileBtn"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.18)",
            background: "#111",
            color: "#fff",
            padding: "10px 12px",
            cursor: "pointer"
          }}
        >
          <Hamburger open={open} />
        </button>
      </nav>

      {/* CSS simples para desktop vs mobile */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (min-width: 860px){
  .navDesktop{ display:flex !important; }
  .navMobileBtn{ display:none !important; }
}
`
        }}
      />

      {/* Drawer (mobile) */}
      {open ? (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          {/* backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)" }} />

          {/* panel */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              width: "86%",
              maxWidth: 360,
              background: "rgba(8,8,8,.98)",
              borderLeft: "1px solid rgba(255,255,255,.10)",
              boxShadow: "0 18px 60px rgba(0,0,0,.6)",
              padding: 14,
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Menu</div>
              <button onClick={() => setOpen(false)} className="btn" style={{ padding: "8px 10px", borderRadius: 12 }}>
                Fechar
              </button>
            </div>

            <div style={{ overflow: "auto", paddingRight: 2 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      color: "#fff",
                      padding: "12px 12px",
                      borderRadius: 14,
                      border: isActive(item.href)
                        ? "1px solid color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.14) 45%)"
                        : "1px solid rgba(255,255,255,.10)",
                      background: isActive(item.href) ? "color-mix(in srgb, var(--accent) 12%, #0b0b0b 88%)" : "#0b0b0b",
                      fontWeight: isActive(item.href) ? 950 : 850
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <button onClick={logout} className="btn btnAccent" style={{ width: "100%", borderRadius: 14 }}>
              Sair
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}