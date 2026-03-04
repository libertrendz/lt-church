/* PATH: app/definicoes/aparencia/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type Option = { key: string; nome: string; hex: string };

const OPTIONS: Option[] = [
  { key: "gold", nome: "Dourado", hex: "#D4AF37" },
  { key: "cyan", nome: "Cian", hex: "#00D4FF" },
  { key: "tangerina", nome: "Tangerina", hex: "#FF8C2B" },
  { key: "verde", nome: "Verde", hex: "#2EE59D" },
  { key: "branco", nome: "Branco", hex: "#FFFFFF" },
  { key: "rosegold", nome: "Rose Gold", hex: "#B76E79" }
];

function findByHex(hex: string | null | undefined): Option | null {
  if (!hex) return null;
  const h = hex.toLowerCase();
  return OPTIONS.find((o) => o.hex.toLowerCase() === h) ?? null;
}

export default function AparenciaPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [igrejaId, setIgrejaId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Option>(OPTIONS[0]);

  useEffect(() => {
    let active = true;

    (async () => {
      setErr(null);
      setOk(null);

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (!data.session) {
        router.replace("/login");
        return;
      }

      try {
        const userId = data.session.user.id;

        // 1) validar role (só admin)
        const uRes = await supabase
          .from("usuarios")
          .select("role, igreja_id")
          .eq("id", userId)
          .single();

        if (uRes.error) throw uRes.error;

        const role = (uRes.data?.role as string | null) ?? "membro";
        const igId = (uRes.data?.igreja_id as string | null) ?? null;

        if (!igId) throw new Error("Sem igreja_id no utilizador.");

        if (role !== "admin") {
          // só admin define aparência
          router.replace("/");
          return;
        }

        if (!active) return;
        setIgrejaId(igId);

        // 2) carregar cor do tenant (igrejas.cor_primaria)
        const iRes = await supabase.from("igrejas").select("cor_primaria").eq("id", igId).single();
        if (iRes.error) throw iRes.error;

        const cor = (iRes.data?.cor_primaria as string | null) ?? null;

        const opt = findByHex(cor) ?? OPTIONS[0];
        if (!active) return;

        setSelected(opt);

        // aplica logo no DOM (fonte de verdade = BD)
        if (cor) document.documentElement.style.setProperty("--accent", cor);
      } catch (e: any) {
        if (!active) return;
        setErr(e?.message ? String(e.message) : "Erro ao carregar.");
      } finally {
        if (!active) return;
        setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function guardar() {
    setErr(null);
    setOk(null);

    try {
      if (!igrejaId) throw new Error("Sem igreja_id.");
      const up = await supabase.from("igrejas").update({ cor_primaria: selected.hex }).eq("id", igrejaId);
      if (up.error) throw up.error;

      // aplica imediatamente em todas as páginas (via CSS var global)
      document.documentElement.style.setProperty("--accent", selected.hex);

      setOk("Guardado.");
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Erro ao guardar.");
    }
  }

  if (!ready) return <main style={{ padding: 6 }}>A carregar…</main>;

  return (
    <main style={{ padding: 6 }}>
      <h1 style={{ marginTop: 4, marginBottom: 6 }}>Aparência</h1>
      <p style={{ opacity: 0.85, marginTop: 0 }}>Definir a cor de contraste (para toda a igreja).</p>

      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}
      {ok ? <p style={{ color: "#7CFF7C" }}>{ok}</p> : null}

      <section className="card" style={{ marginTop: 12, borderRadius: 18, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Escolher cor</div>

        <div style={{ display: "grid", gap: 10 }}>
          {OPTIONS.map((o) => {
            const active = o.key === selected.key;
            return (
              <button
                key={o.key}
                onClick={() => setSelected(o)}
                style={{
                  textAlign: "left",
                  borderRadius: 16,
                  border: active ? `1px solid ${o.hex}` : "1px solid rgba(255,255,255,.12)",
                  background: "#070707",
                  color: "#fff",
                  padding: 12,
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{o.nome}</div>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: o.hex,
                      border: "1px solid rgba(255,255,255,.18)",
                      display: "inline-block"
                    }}
                  />
                </div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>{o.hex}</div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={guardar} className="btn btnAccent" style={{ borderRadius: 12 }}>
            Guardar
          </button>

          <a href="/" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
            Voltar ao Início
          </a>
        </div>
      </section>
    </main>
  );
}