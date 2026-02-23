/* PATH: app/agenda/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type AtividadeRow = { id: string; nome: string; ativo?: boolean };
type CongregacaoRow = { id: string; nome: string; ativa?: boolean };

type EventoRow = {
  id: string;
  starts_at: string | null;
  ends_at: string | null;
  titulo: string | null;
  tema: string | null;
  status: "agendado" | "cancelado";
  publico: boolean;
  serie_id: string | null;
  atividade_id: string | null;
  congregacao_id: string | null;
};

function fmtDateTimeLisbon(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function monthKeyLisbon(iso: string | null) {
  if (!iso) return "Sem data";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    month: "long",
    year: "numeric"
  }).formatToParts(d);

  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${month} ${year}`.replace(/^./, (c) => c.toUpperCase());
}

function toIsoFromLocal(dtLocal: string) {
  const d = new Date(dtLocal);
  return d.toISOString();
}

export default function AgendaEventosPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [atividades, setAtividades] = useState<AtividadeRow[]>([]);
  const [congregacoes, setCongregacoes] = useState<CongregacaoRow[]>([]);
  const [items, setItems] = useState<EventoRow[]>([]);

  // create avulso
  const [atividadeId, setAtividadeId] = useState("");
  const [congregacaoId, setCongregacaoId] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tema, setTema] = useState("");
  const [descricao, setDescricao] = useState("");
  const [publico, setPublico] = useState(true);

  // UI: month expand/collapse
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
    setOk(null);

    const okSession = await requireSessionOrRedirect();
    if (!okSession) return;

    const atvRes = await supabase.from("atividades").select("id, nome, ativo").order("nome", { ascending: true });
    if (atvRes.error) {
      setErr(atvRes.error.message);
      setBusy(false);
      return;
    }

    const conRes = await supabase.from("congregacoes").select("id, nome, ativa").order("nome", { ascending: true });
    if (conRes.error) {
      setErr(conRes.error.message);
      setBusy(false);
      return;
    }

    const evRes = await supabase
      .from("agenda_eventos")
      .select("id, starts_at, ends_at, titulo, tema, status, publico, serie_id, atividade_id, congregacao_id")
      .order("starts_at", { ascending: true })
      .limit(400);

    if (evRes.error) {
      setErr(evRes.error.message);
      setBusy(false);
      return;
    }

    const loaded = (evRes.data as EventoRow[]) ?? [];
    setItems(loaded);

    // abrir automaticamente o mês actual (Lisboa) e os meses que tenham eventos (default aberto)
    const months = new Set(loaded.map((x) => monthKeyLisbon(x.starts_at)));
    setOpenMonths((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const m of months) if (next[m] === undefined) next[m] = true;
      return next;
    });

    setAtividades(((atvRes.data as AtividadeRow[]) ?? []).map((a) => ({ ...a })));
    setCongregacoes(((conRes.data as CongregacaoRow[]) ?? []).map((c) => ({ ...c })));
    setBusy(false);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAvulso() {
    setSaving(true);
    setErr(null);
    setOk(null);

    if (!atividadeId) {
      setSaving(false);
      setErr("Seleciona o tipo (atividade).");
      return;
    }
    if (!startsLocal) {
      setSaving(false);
      setErr("Define a data/hora de início.");
      return;
    }

    const startsIso = toIsoFromLocal(startsLocal);
    const endsIso = endsLocal ? toIsoFromLocal(endsLocal) : null;

    const { data, error } = await supabase.rpc("create_agenda_evento", {
      p_atividade_id: atividadeId,
      p_starts_at: startsIso,
      p_congregacao_id: congregacaoId ? congregacaoId : null,
      p_ends_at: endsIso,
      p_titulo: titulo.trim() ? titulo.trim() : null,
      p_tema: tema.trim() ? tema.trim() : null,
      p_descricao: descricao.trim() ? descricao.trim() : null,
      p_publico: publico,
      p_status: "agendado"
    });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(`Evento criado (id: ${data}).`);
    setTitulo("");
    setTema("");
    setDescricao("");
    setStartsLocal("");
    setEndsLocal("");
    setAtividadeId("");
    setCongregacaoId("");
    setPublico(true);

    await load();
  }

  async function cancelOrRestore(ev: EventoRow) {
    setErr(null);
    setOk(null);

    const next = ev.status === "agendado" ? "cancelado" : "agendado";
    const { error } = await supabase.from("agenda_eventos").update({ status: next }).eq("id", ev.id);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(next === "cancelado" ? "Evento cancelado." : "Evento reativado.");
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const atividadeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of atividades) m.set(a.id, a.nome);
    return m;
  }, [atividades]);

  const congregacaoName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of congregacoes) m.set(c.id, c.nome);
    return m;
  }, [congregacoes]);

  const atividadesAtivas = useMemo(() => {
    // não assumir coluna "ativo" (mas se existir, respeitamos)
    const hasAtivo = atividades.some((a) => typeof a.ativo === "boolean");
    return hasAtivo ? atividades.filter((a) => a.ativo !== false) : atividades;
  }, [atividades]);

  const congregacoesAtivas = useMemo(() => {
    const hasAtiva = congregacoes.some((c) => typeof c.ativa === "boolean");
    return hasAtiva ? congregacoes.filter((c) => c.ativa !== false) : congregacoes;
  }, [congregacoes]);

  const grouped = useMemo(() => {
    const map = new Map<string, EventoRow[]>();
    for (const ev of items) {
      const k = monthKeyLisbon(ev.starts_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return Array.from(map.entries()); // já vem ordenado por starts_at no load
  }, [items]);

  function toggleMonth(m: string) {
    setOpenMonths((prev) => ({ ...prev, [m]: !prev[m] }));
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, color: "#fff" }}>
      <h1 style={{ marginTop: 0 }}>Agenda — Eventos</h1>
      <p style={{ opacity: 0.85, marginTop: 6 }}>
        <b>Atividade</b> = tipo (Culto/Reunião/etc.). <b>Série</b> = recorrência. <b>Evento</b> = instância.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <a href="/agenda/series" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Recorrências (Séries)
        </a>

        <a href="/escalas" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Escalas
        </a>

        <button
          onClick={logout}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #444",
            background: "#111",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Sair
        </button>

        {ok ? <span style={{ color: "#7CFF7C" }}>{ok}</span> : null}
      </div>

      {busy ? <p style={{ marginTop: 14 }}>A carregar…</p> : null}
      {err ? <p style={{ marginTop: 14, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {/* Create avulso */}
      <div style={{ marginTop: 16, padding: 16, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Criar evento avulso</h2>

        <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Atividade (tipo)</span>
            <select
              value={atividadeId}
              onChange={(e) => setAtividadeId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
            >
              <option value="">—</option>
              {atividadesAtivas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Congregação (opcional)</span>
            <select
              value={congregacaoId}
              onChange={(e) => setCongregacaoId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
            >
              <option value="">—</option>
              {congregacoesAtivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Início (Lisboa)</span>
              <input
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Fim (opcional)</span>
              <input
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Título (opcional)</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Tema (opcional)</span>
            <input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Descrição (opcional)</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
            />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
            <span>Evento público</span>
          </label>

          <button
            onClick={createAvulso}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #444",
              background: saving ? "#222" : "#111",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              width: 220
            }}
          >
            {saving ? "A criar…" : "Criar evento"}
          </button>
        </div>
      </div>

      {/* Grouped list */}
      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18 }}>Eventos gravados</h2>

        {!busy && items.length === 0 ? <p>Sem eventos.</p> : null}

        {!busy && items.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {grouped.map(([month, evs]) => {
              const open = openMonths[month] ?? true;
              return (
                <section
                  key={month}
                  style={{ border: "1px solid #333", borderRadius: 16, background: "#0b0b0b", overflow: "hidden" }}
                >
                  <button
                    onClick={() => toggleMonth(month)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      background: "#0f0f0f",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span style={{ fontWeight: 900 }}>{month}</span>
                    <span style={{ opacity: 0.85 }}>{open ? "▾" : "▸"} {evs.length}</span>
                  </button>

                  {open ? (
                    <div style={{ padding: 12, display: "grid", gap: 10 }}>
                      {evs.map((ev) => {
                        const aName = ev.atividade_id ? atividadeName.get(ev.atividade_id) : null;
                        const cName = ev.congregacao_id ? congregacaoName.get(ev.congregacao_id) : "—";
                        const label = ev.titulo?.trim()
                          ? ev.titulo
                          : aName
                          ? `${aName}${ev.serie_id ? " (gerado)" : " (avulso)"}`
                          : "Evento";

                        return (
                          <div
                            key={ev.id}
                            style={{
                              padding: 14,
                              borderRadius: 14,
                              border: "1px solid #333",
                              background: "#0b0b0b",
                              opacity: ev.status === "cancelado" ? 0.7 : 1
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                              <div>
                                <div style={{ fontWeight: 900 }}>
                                  {label}{" "}
                                  {ev.status === "cancelado" ? <span style={{ opacity: 0.8 }}>(cancelado)</span> : null}
                                </div>
                                <div style={{ opacity: 0.85, marginTop: 4 }}>
                                  {fmtDateTimeLisbon(ev.starts_at)}
                                  {ev.ends_at ? ` → ${fmtDateTimeLisbon(ev.ends_at)}` : ""} · Congregação: {cName}
                                </div>
                                {ev.tema ? <div style={{ opacity: 0.85, marginTop: 4 }}>Tema: {ev.tema}</div> : null}
                              </div>

                              <div style={{ display: "flex", gap: 10 }}>
                                <a
                                  href={`/escalas`}
                                  style={{
                                    padding: "10px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #444",
                                    background: "#111",
                                    color: "#fff",
                                    textDecoration: "none",
                                    whiteSpace: "nowrap"
                                  }}
                                  title="Abrir/criar escala a partir do menu Escalas"
                                >
                                  Escala
                                </a>

                                <button
                                  onClick={() => cancelOrRestore(ev)}
                                  style={{
                                    padding: "10px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #444",
                                    background: ev.status === "agendado" ? "#2a0f0f" : "#0f2a12",
                                    color: "#fff",
                                    cursor: "pointer",
                                    minWidth: 130
                                  }}
                                >
                                  {ev.status === "agendado" ? "Cancelar" : "Reativar"}
                                </button>
                              </div>
                            </div>
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
      </div>
    </main>
  );
}
