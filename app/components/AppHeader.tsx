/* PATH: app/components/AppHeader.tsx */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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
  const [open, setOpen] = useState(false);

  // fecha ao navegar
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

  // bloquear scroll quando drawer aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

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
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            minWidth: 0
          }}
        >
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
            <div style={{ color: "rgba(255,255,255,.75)", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
              Operacional
            </div>
          </div>
        </a>

        <span style={{ flex: 1 }} />

        {/* Desktop nav (esconde em mobile via CSS inline simples) */}
        <div
          className="navDesktop"
          style={{
            display: "none",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          {NAV.filter((x) => !["/me", "/definicoes/aparencia"].includes(x.href)).map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="navlink"
              style={{
                textDecoration: "none",
                opacity: active(item.href) ? 1 : 0.9,
                fontWeight: active(item.href) ? 900 : 800,
                borderBottom: active(item.href) ? "2px solid var(--accent)" : "2px solid transparent",
                paddingBottom: 6
              }}
            >
              {item.label}
            </a>
          ))}
          <a className="navlink" href="/definicoes/aparencia" style={{ textDecoration: "none", opacity: 0.9 }}>
            Aparência
          </a>
          <a className="navlink" href="/me" style={{ textDecoration: "none", opacity: 0.9 }}>
            Perfil
          </a>
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
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60
          }}
        >
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.55)"
            }}
          />

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
              <button
                onClick={() => setOpen(false)}
                className="btn"
                style={{ padding: "8px 10px", borderRadius: 12 }}
              >
                Fechar
              </button>
            </div>

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
                    border: active(item.href) ? "1px solid color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.14) 45%)" : "1px solid rgba(255,255,255,.10)",
                    background: active(item.href) ? "color-mix(in srgb, var(--accent) 12%, #0b0b0b 88%)" : "#0b0b0b",
                    fontWeight: active(item.href) ? 950 : 850
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.35 }}>
              Dark fixo + cor de contraste (accent).
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}