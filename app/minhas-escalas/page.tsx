/* PATH: app/minhas-escalas/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type EventoRow = {
  id: string;
  starts_at: string | null;
  titulo: string | null;
  congregacao_id: string | null;
};

type CongregacaoRow = { id: string; nome: string | null };

function fmtLisbon(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function monthKeyLisbon(iso: string | null) {
  if (!iso) return "sem-data";
  const d = new Date(iso);
  const y = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", month: "2-digit" }).format(d);
  return `${y}-${m}`;
}

function monthLabelLisbonFromKey(key: string) {
  if (key === "sem-data") return "Sem data";
  const [y, m] = key.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    month: "long",
    year: "numeric"
  }).format(d);
}

export default function MinhasEscalasPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [congs, setCongs] = useState<Map<string, CongregacaoRow>>(new Map());

  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  async function requireSessionOrRedirect() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

  async function load() {
    setBusy(true);
    setErr(null);

    const ok = await requireSessionOrRedirect();
    if (!ok) return;

    // obter atividade "Culto"
    const atRes = await supabase
      .from("atividades")
      .select("id")
      .ilike("nome", "culto")
      .limit(1)
      .maybeSingle();

    if (atRes.error) {
      setErr(atRes.error.message);
      setBusy(false);
      return;
    }

    const cultoAtividadeId = atRes.data?.id;
    if (!cultoAtividadeId) {
      setErr("Não existe a atividade 'Culto'.");
      setBusy(false);
      return;
    }

    // eventos futuros
    const nowIso = new Date().toISOString();

    const evRes = await supabase
      .from("agenda_eventos")
      .select("id, starts_at, titulo, congregacao_id")
      .eq("atividade_id", cultoAtividadeId)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(60);

    if (evRes.error) {
      setErr(evRes.error.message);
      setBusy(false);
      return;
    }

    const evs = (evRes.data as EventoRow[]) ?? [];
    setEventos(evs);

    // congregações
    const ids = Array.from(new Set(evs.map((e) => e.congregacao_id).filter(Boolean))) as string[];

    if (ids.length > 0) {
      const cgRes = await supabase.from("congregacoes").select("id, nome").in("id", ids);

      if (cgRes.error) {
        setErr(cgRes.error.message);
        setBusy(false);
        return;
      }

      const map = new Map<string, CongregacaoRow>();
      ((cgRes.data as CongregacaoRow[]) ?? []).forEach((c) => map.set(c.id, c));
      setCongs(map);
    }

    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, EventoRow[]>();
    for (const ev of eventos) {
      const k = monthKeyLisbon(ev.starts_at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(ev);
    }
    const keys = Array.from(m.keys()).sort((a, b) => a.localeCompare(b));
    return { map: m, keys };
  }, [eventos]);

  function toggleMonth(key: string) {
    setOpenMonths((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto", color: "#fff" }}>
      <h1 style={{ marginBottom: 6 }}>Minhas Escalas</h1>
      <p style={{ opacity: 0.85 }}>Consulta os próximos cultos onde poderás estar envolvido.</p>

      {busy && <p>A carregar…</p>}
      {err && <p style={{ color: "#ff6b6b" }}>{err}</p>}

      {!busy && (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {grouped.keys.map((k) => {
            const list = grouped.map.get(k) ?? [];
            const isOpen = !!openMonths[k];

            return (
              <section key={k} style={{ border: "1px solid #333", borderRadius: 16, background: "#0b0b0b" }}>
                <button
                  onClick={() => toggleMonth(k)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 14,
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <strong>{monthLabelLisbonFromKey(k)}</strong>
                  <span>{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: 14, display: "grid", gap: 12 }}>
                    {list.map((ev) => {
                      const congName = ev.congregacao_id
                        ? congs.get(ev.congregacao_id)?.nome ?? "—"
                        : "—";

                      return (
                        <div
                          key={ev.id}
                          style={{
                            border: "1px solid #333",
                            borderRadius: 18,
                            background: "#070707",
                            padding: 14
                          }}
                        >
                          <div style={{ fontWeight: 900, fontSize: 18 }}>
                            {ev.titulo || "Culto"}
                          </div>

                          <div style={{ marginTop: 6 }}>{fmtLisbon(ev.starts_at)}</div>
                          <div style={{ opacity: 0.8 }}>Congregação: {congName}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
