/* PATH: app/cultos/page.tsx */
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
type EscalaRow = { id: string; evento_id: string };

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
  return `${y}-${m}`; // YYYY-MM
}

function monthLabelLisbonFromKey(key: string) {
  if (key === "sem-data") return "Sem data";
  const [y, m] = key.split("-").map((x) => parseInt(x, 10));
  // criar uma data segura no dia 1, hora 12 UTC para evitar edge cases
  const d = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", month: "long", year: "numeric" }).format(d);
}

function currentMonthKeyLisbon() {
  const now = new Date();
  const y = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric" }).format(now);
  const m = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", month: "2-digit" }).format(now);
  return `${y}-${m}`;
}

function Pill({ label, tone }: { label: string; tone: "neutral" | "warn" | "ok" }) {
  const bg = tone === "ok" ? "#0f2a12" : tone === "warn" ? "#2a1d0f" : "#111";
  const bd = tone === "ok" ? "#1f6a2a" : tone === "warn" ? "#6a4a1f" : "#333";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${bd}`,
        background: bg,
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        opacity: 0.95
      }}
    >
      {label}
    </span>
  );
}

export default function CultosHubPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [congs, setCongs] = useState<Map<string, CongregacaoRow>>(new Map());
  const [escalaByEvento, setEscalaByEvento] = useState<Map<string, EscalaRow>>(new Map());
  const [pessoasByEscala, setPessoasByEscala] = useState<Map<string, number>>(new Map());
  const [creating, setCreating] = useState<Record<string, boolean>>({});

  // colapsos por mês
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  async function requireSessionOrRedirect() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    router.replace("/login");
    return false;
  }

  // 🔒 valida role (admin only)
  const userId = data.session.user.id;

  const uRes = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", userId)
    .single();

  if (uRes.error || uRes.data?.role !== "admin") {
    router.replace("/");
    return false;
  }

  return true;
}
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function load() {
    setBusy(true);
    setErr(null);

    const ok = await requireSessionOrRedirect();
    if (!ok) return;

    // 1) obter atividade "Culto" (case-insensitive)
    const atRes = await supabase.from("atividades").select("id, nome").ilike("nome", "culto").limit(1).maybeSingle();
    if (atRes.error) {
      setErr(atRes.error.message);
      setBusy(false);
      return;
    }
    const cultoAtividadeId = atRes.data?.id;
    if (!cultoAtividadeId) {
      setErr("Não existe a atividade 'Culto' em 'atividades'.");
      setBusy(false);
      return;
    }

    // 2) próximos eventos de culto
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

    // abrir automaticamente o mês atual (e fechar os outros por defeito)
    const cur = currentMonthKeyLisbon();
    setOpenMonths((prev) => {
      // preserva escolhas do utilizador se já existirem
      if (Object.keys(prev).length > 0) return prev;
      return { [cur]: true };
    });

    // 3) congregações (nomes)
    const congIds = Array.from(new Set(evs.map((e) => e.congregacao_id).filter(Boolean))) as string[];
    if (congIds.length > 0) {
      const cgRes = await supabase.from("congregacoes").select("id, nome").in("id", congIds);
      if (cgRes.error) {
        setErr(cgRes.error.message);
        setBusy(false);
        return;
      }
      const map = new Map<string, CongregacaoRow>();
      ((cgRes.data as CongregacaoRow[]) ?? []).forEach((c) => map.set(c.id, c));
      setCongs(map);
    } else {
      setCongs(new Map());
    }

    // 4) escalas existentes para estes eventos
    const eventIds = evs.map((e) => e.id);
    if (eventIds.length === 0) {
      setEscalaByEvento(new Map());
      setPessoasByEscala(new Map());
      setBusy(false);
      return;
    }

    const esRes = await supabase.from("escalas").select("id, evento_id").in("evento_id", eventIds);
    if (esRes.error) {
      setErr(esRes.error.message);
      setBusy(false);
      return;
    }

    const escalas = (esRes.data as EscalaRow[]) ?? [];
    const mapEsc = new Map<string, EscalaRow>();
    escalas.forEach((s) => mapEsc.set(s.evento_id, s));
    setEscalaByEvento(mapEsc);

    // 5) contar pessoas por escala (via escala_itens)
    if (escalas.length > 0) {
      const escalaIds = escalas.map((s) => s.id);
      const itRes = await supabase.from("escala_itens").select("id, escala_id").in("escala_id", escalaIds);

      if (itRes.error) {
        setErr(itRes.error.message);
        setBusy(false);
        return;
      }

      const counts = new Map<string, number>();
      for (const row of (itRes.data as any[]) ?? []) {
        const sid = row.escala_id as string;
        counts.set(sid, (counts.get(sid) ?? 0) + 1);
      }
      setPessoasByEscala(counts);
    } else {
      setPessoasByEscala(new Map());
    }

    setBusy(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createEscalaForEvento(eventoId: string) {
    setCreating((p) => ({ ...p, [eventoId]: true }));
    setErr(null);

    const res = await supabase.from("escalas").insert({ evento_id: eventoId }).select("id, evento_id").single();

    setCreating((p) => ({ ...p, [eventoId]: false }));

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    const escalaId = (res.data as EscalaRow).id;
    router.push(`/escalas/${escalaId}`);
  }

  const grouped = useMemo(() => {
    const m = new Map<string, EventoRow[]>();
    for (const ev of eventos) {
      const k = monthKeyLisbon(ev.starts_at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(ev);
    }
    // ordenar keys por data asc
    const keys = Array.from(m.keys()).sort((a, b) => a.localeCompare(b));
    return { map: m, keys };
  }, [eventos]);

  function toggleMonth(key: string) {
    setOpenMonths((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto", color: "#fff" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>
          Início
        </a>
        <a href="/agenda" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>
          Agenda
        </a>
        <span style={{ flex: 1 }} />
        <button
          onClick={logout}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #444", background: "#111", color: "#fff" }}
        >
          Sair
        </button>
      </header>

      <h1 style={{ marginTop: 14, marginBottom: 6 }}>Cultos & Escalas</h1>
      <p style={{ opacity: 0.85, marginTop: 0 }}>
        Age por culto/evento. A escala começa vazia e tu adicionas pessoas por função.
      </p>

      {busy ? <p>A carregar…</p> : null}
      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {!busy ? (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {eventos.length === 0 ? (
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b", opacity: 0.9 }}>
              Não há cultos futuros encontrados.
            </div>
          ) : null}

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
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16, textTransform: "capitalize" }}>
                    {monthLabelLisbonFromKey(k)}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", opacity: 0.9 }}>
                    <span>{list.length} culto(s)</span>
                    <span style={{ opacity: 0.8 }}>{isOpen ? "▾" : "▸"}</span>
                  </div>
                </button>

                {isOpen ? (
                  <div style={{ borderTop: "1px solid #222", padding: 14, display: "grid", gap: 12 }}>
                    {list.map((ev) => {
                      const escala = escalaByEvento.get(ev.id) ?? null;
                      const pessoas = escala ? (pessoasByEscala.get(escala.id) ?? 0) : 0;

                      const congName = ev.congregacao_id ? congs.get(ev.congregacao_id)?.nome ?? "—" : "—";
                      const title = ev.titulo?.trim() ? ev.titulo : "Culto";

                      const hasEscala = !!escala;
                      const hasEquipa = pessoas > 0;

                      const pill = !hasEscala ? (
                        <Pill label="Sem escala" tone="neutral" />
                      ) : !hasEquipa ? (
                        <Pill label="Sem equipa" tone="warn" />
                      ) : (
                        <Pill label={`${pessoas} pessoa(s)`} tone="ok" />
                      );

                      const btnDisabled = creating[ev.id] === true;

                      return (
                        <div
                          key={ev.id}
                          style={{
                            border: "1px solid #333",
                            borderRadius: 18,
                            background: "#070707",
                            padding: 14,
                            display: "grid",
                            gap: 10
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>

                            {hasEscala ? (
                              <button
                                onClick={() => router.push(`/escalas/${escala!.id}`)}
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: 14,
                                  border: "1px solid #444",
                                  background: "#111",
                                  color: "#fff"
                                }}
                              >
                                Gerir escala
                              </button>
                            ) : (
                              <button
                                disabled={btnDisabled}
                                onClick={() => createEscalaForEvento(ev.id)}
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: 14,
                                  border: "1px solid #444",
                                  background: btnDisabled ? "#222" : "#111",
                                  color: "#fff"
                                }}
                              >
                                Criar escala
                              </button>
                            )}
                          </div>

                          <div style={{ opacity: 0.9 }}>{fmtLisbon(ev.starts_at)}</div>
                          <div style={{ opacity: 0.8 }}>Congregação: {congName}</div>

                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{pill}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
