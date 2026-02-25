/* PATH: app/layout.tsx */
export const metadata = {
  title: "LTZ-CHURCH",
  description: "Multi-tenant SaaS para igrejas",
  icons: {
    icon: [
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/images/favicon.ico" }
    ],
    apple: [{ url: "/images/icon-180x180.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#D4AF37"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
          background: "#050505",
          color: "#fff"
        }}
      >
        {/* aplica accent cedo (localStorage) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var v = localStorage.getItem("ltz_accent");
    if (v) document.documentElement.style.setProperty("--accent", v);
  } catch(e) {}
})();`
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
:root{
  --accent: #D4AF37;         /* default dourado */
  --bg: #050505;
  --card: #0b0b0b;
  --card2: #070707;
  --border: #2a2a2a;
  --textDim: rgba(255,255,255,.82);
  --shadow: 0 10px 30px rgba(0,0,0,.35);
}

/* links */
a{ color: var(--accent); }
a.navlink{ color:#fff; opacity:.9; }
a.navlink:hover{ opacity:1; }

/* headings: underline discreto com accent */
.h-accent{
  display:inline-block;
  position:relative;
}
.h-accent:after{
  content:"";
  display:block;
  height:3px;
  width:56px;
  margin-top:8px;
  border-radius:99px;
  background: var(--accent);
  opacity:.9;
}

/* cards com sombra e borda subtil */
.card{
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 18px;
  box-shadow: var(--shadow);
}

/* botões */
.btn{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.18);
  background: #111;
  color: #fff;
  cursor: pointer;
}
.btn:hover{ border-color: rgba(255,255,255,.28); }

.btnAccent{
  border: 1px solid color-mix(in srgb, var(--accent) 60%, rgba(255,255,255,.12) 40%);
  background: color-mix(in srgb, var(--accent) 18%, #111 82%);
  color:#fff;
}
.btnAccent:hover{
  background: color-mix(in srgb, var(--accent) 26%, #111 74%);
}

/* pills/badges */
.pill{
  display:inline-flex;
  align-items:center;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid #333;
  background:#111;
  font-weight:800;
  font-size:13px;
  color:#fff;
}
.pillAccent{
  border: 1px solid color-mix(in srgb, var(--accent) 55%, #333 45%);
  background: color-mix(in srgb, var(--accent) 18%, #0b0b0b 82%);
}
`
          }}
        />

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
              padding: "14px 18px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
              {/* logo maior */}
              <img
                src="/images/logo_oficial_church.png"
                alt="LTZ-CHURCH"
                width={44}
                height={44}
                style={{ borderRadius: 10, display: "block" }}
              />
              <span style={{ color: "#fff", fontWeight: 900, letterSpacing: 0.2 }}>LTZ-CHURCH</span>
            </a>

            <a className="navlink" href="/cultos" style={{ textDecoration: "none" }}>
              Cultos & Escalas
            </a>
            <a className="navlink" href="/agenda" style={{ textDecoration: "none" }}>
              Agenda
            </a>
            <a className="navlink" href="/membros" style={{ textDecoration: "none" }}>
              Membros
            </a>
            <a className="navlink" href="/departamentos" style={{ textDecoration: "none" }}>
              Departamentos
            </a>
            <a className="navlink" href="/funcoes" style={{ textDecoration: "none" }}>
              Funções
            </a>

            <span style={{ flex: 1 }} />

            <a className="navlink" href="/definicoes/aparencia" style={{ textDecoration: "none" }}>
              Aparência
            </a>
            <a className="navlink" href="/me" style={{ textDecoration: "none" }}>
              Perfil
            </a>
          </nav>
        </header>

        <main style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>{children}</main>
      </body>
    </html>
  );
}
