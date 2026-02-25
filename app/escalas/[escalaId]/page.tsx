/* PATH: app/escalas/[escalaId]/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type EscalaRow = { id: string; evento_id: string | null; igreja_id: string | null };
type EventoRow = { id: string; starts_at: string | null; titulo: string | null; atividade_id: string | null };

type FuncaoRow = { id: string; nome: string };
type MembroRow = { id: string; nome: string | null };

type ItemRow = {
  id: string;
  funcao_id: string | null;
  membro_id: string;
  status: string | null;
  notas: string | null;
  membros?: any; // pode vir como objecto ou array dependendo do select
};

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

function pessoaLabel(id: string, nome: string | null) {
  return (nome && nome.trim()) || id;
}

function pickMembroFromJoin(joined: any): { id: string; nome: string | null } | null {
  if (!joined) return null;
  // supabase pode devolver objecto
  if (typeof joined === "object" && !Array.isArray(joined) && joined.id) {
    return { id: joined.id, nome: joined.nome ?? null };
  }
  // ou array
  if (Array.isArray(joined) && joined.length > 0 && joined[0]?.id) {
    return { id: joined[0].id, nome: joined[0].nome ?? null };
  }
  return null;
}

export default function EscalaDetalhePage() {
  const router = useRouter();
  const params = useParams<{ escalaId: string }>();
  const escalaId = params.escalaId;

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [escala, setEscala] = useState<EscalaRow | null>(null);
  const [evento, setEvento] = useState<EventoRow | null>(null);

  const [funcoes, setFuncoes] = useState<FuncaoRow[]>([]);
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [itens, setItens] = useState<ItemRow[]>([]);

  // UI state por função
  const [openAdd, setOpenAdd] = useState<Record<string, boolean>>({});
  const [pickMembroId, setPickMembroId] = useState<Record<string, string>>({});
  const [pickStatus, setPickStatus] = useState<Record<string, string>>({});
  const [pickNotas, setPickNotas] = useState<Record<string, string>>({});
  const [savingFuncao, setSavingFuncao] = useState<Record<string, boolean>>({});
  const [removingItem, setRemovingItem] = useState<Record<string, boolean>>({});

  async function requireSessionOrRedirect() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
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
    setOk(null);

    const okSession = await requireSessionOrRedirect();
    if (!okSession) return;

    // escala
    const esRes = await supabase
      .from("escalas")
      .select("id, evento_id, igreja_id")
      .eq("id", escalaId)
      .single();

    if (esRes.error) {
      setErr(esRes.error.message);
      setBusy(false);
      return;
    }
    const escalaRow = esRes.data as EscalaRow;
    setEscala(escalaRow);

    if (!escalaRow.evento_id) {
      setErr("Esta escala não tem evento associado.");
      setBusy(false);
      return;
    }

    // evento
    const evRes = await supabase
      .from("agenda_eventos")
      .select("id, starts_at, titulo, atividade_id")
      .eq("id", escalaRow.evento_id)
      .single();

    if (evRes.error) {
      setErr(evRes.error.message);
      setBusy(false);
      return;
    }
    const eventoRow = evRes.data as EventoRow;
    setEvento(eventoRow);

    // funções activas para este tipo (defaults)
    if (eventoRow.atividade_id) {
      const fRes = await supabase
        .from("atividade_funcoes_defaults")
        .select("funcao_id, funcoes:funcao_id(id, nome)")
        .eq("atividade_id", eventoRow.atividade_id)
        .eq("ativo", true);

      if (fRes.error) {
        setErr(fRes.error.message);
        setBusy(false);
        return;
      }

      const fs: FuncaoRow[] = ((fRes.data as any[]) ?? [])
        .map((r) => (r.funcoes ? { id: r.funcoes.id as string, nome: r.funcoes.nome as string } : null))
        .filter(Boolean) as FuncaoRow[];

      fs.sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
      setFuncoes(fs);
    } else {
      setFuncoes([]);
    }

    // itens existentes (equipa)
    const itRes = await supabase
      .from("escala_itens")
      .select("id, funcao_id, membro_id, status, notas, membros:membro_id(id, nome)")
      .eq("escala_id", escalaId);

    if (itRes.error) {
      setErr(itRes.error.message);
      setBusy(false);
      return;
    }
    setItens((itRes.data as unknown as ItemRow[]) ?? []);

    // lista de membros (dropdown)
    const memRes = await supabase.from("membros").select("id, nome").order("nome", { ascending: true }).limit(500);
    if (memRes.error) {
      setErr(memRes.error.message);
      setBusy(false);
      return;
    }
    setMembros((memRes.data as MembroRow[]) ?? []);

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
  }, [escalaId]);

  const itemsByFuncao = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const it of itens) {
      const fid = it.funcao_id ?? "sem-funcao";
      if (!m.has(fid)) m.set(fid, []);
      m.get(fid)!.push(it);
    }
    return m;
  }, [itens]);

  async function addPessoa(funcaoId: string) {
    const membroId = (pickMembroId[funcaoId] ?? "").trim();
    if (!membroId) {
      setErr("Seleciona um membro.");
      return;
    }

    setSavingFuncao((p) => ({ ...p, [funcaoId]: true }));
    setErr(null);
    setOk(null);

    const status = ((pickStatus[funcaoId] ?? "confirmado").trim() || "confirmado") as string;
    const notas = (pickNotas[funcaoId] ?? "").trim() || null;

    const res = await supabase.rpc("add_member_to_funcao", {
      p_escala_id: escalaId,
      p_funcao_id: funcaoId,
      p_membro_id: membroId,
      p_status: status,
      p_notas: notas
    });

    setSavingFuncao((p) => ({ ...p, [funcaoId]: false }));

    if (res.error) {
      // no telemóvel às vezes aparece “Failed to fetch”; isto força mensagem útil quando existe
      setErr(res.error.message || "Erro ao adicionar. Verifica sessão e permissões.");
      return;
    }

    setOk("Adicionado.");
    setPickMembroId((p) => ({ ...p, [funcaoId]: "" }));
    setPickNotas((p) => ({ ...p, [funcaoId]: "" }));
    setOpenAdd((p) => ({ ...p, [funcaoId]: false }));
    await load();
  }

  async function remover(itemId: string) {
    setRemovingItem((p) => ({ ...p, [itemId]: true }));
    setErr(null);
    setOk(null);

    const res = await supabase.rpc("remove_escala_item", { p_item_id: itemId });

    setRemovingItem((p) => ({ ...p, [itemId]: false }));

    if (res.error) {
      setErr(res.error.message || "Erro ao remover. Verifica sessão e permissões.");
      return;
    }

    setOk("Removido.");
    await load();
  }

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto", color: "#fff" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/cultos" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>
          Cultos & Escalas
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

      <h1 style={{ marginTop: 14, marginBottom: 6 }}>Equipa do Culto</h1>

      {busy ? <p>A carregar…</p> : null}
      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}
      {ok ? <p style={{ color: "#7CFF7C" }}>{ok}</p> : null}

      {!busy ? (
        <section style={{ marginTop: 10, padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
          <div style={{ fontWeight: 900 }}>
            {evento?.starts_at ? `${fmtLisbon(evento.starts_at)} · ${evento.titulo ?? "Culto"}` : (evento?.titulo ?? "Culto")}
          </div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Escala: {escala?.id}</div>
        </section>
      ) : null}

      {!busy ? (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {funcoes.length === 0 ? (
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
              <div style={{ fontWeight: 900 }}>Sem funções configuradas</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>
                Este tipo de evento ainda não tem funções activas. (Admin: definir em defaults do tipo de evento.)
              </div>
            </div>
          ) : null}

          {funcoes.map((f) => {
            const list = itemsByFuncao.get(f.id) ?? [];
            const adding = !!openAdd[f.id];
            const saving = !!savingFuncao[f.id];

            return (
              <section key={f.id} style={{ border: "1px solid #333", borderRadius: 16, background: "#0b0b0b" }}>
                <div style={{ padding: 12, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{f.nome}</div>
                  <div style={{ opacity: 0.85 }}>{list.length} pessoa(s)</div>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  {list.length === 0 ? <div style={{ opacity: 0.75 }}>Vazio</div> : null}

                  {list.map((it) => {
                    const m = pickMembroFromJoin(it.membros);
                    const label = m ? pessoaLabel(m.id, m.nome) : it.membro_id;
                    const removing = !!removingItem[it.id];

                    return (
                      <div
                        key={it.id}
                        style={{
                          border: "1px solid #333",
                          borderRadius: 14,
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center"
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ fontWeight: 800 }}>{label}</div>
                          <div style={{ opacity: 0.8, fontSize: 13 }}>
                            {it.status ? `Status: ${it.status}` : null}
                            {it.status && it.notas ? " · " : null}
                            {it.notas ? `Notas: ${it.notas}` : null}
                          </div>
                        </div>

                        <button
                          onClick={() => remover(it.id)}
                          disabled={removing}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #444",
                            background: removing ? "#222" : "#2a0f0f",
                            color: "#fff"
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}

                  {!adding ? (
                    <button
                      onClick={() => setOpenAdd((p) => ({ ...p, [f.id]: true }))}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #444",
                        background: "#111",
                        color: "#fff",
                        width: "fit-content"
                      }}
                    >
                      + Adicionar pessoa
                    </button>
                  ) : (
                    <div style={{ border: "1px solid #333", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Membro</span>
                          <select
                            value={pickMembroId[f.id] ?? ""}
                            onChange={(e) => setPickMembroId((p) => ({ ...p, [f.id]: e.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                          >
                            <option value="">—</option>
                            {membros.map((m) => (
                              <option key={m.id} value={m.id}>
                                {pessoaLabel(m.id, m.nome)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Status</span>
                          <select
                            value={pickStatus[f.id] ?? "confirmado"}
                            onChange={(e) => setPickStatus((p) => ({ ...p, [f.id]: e.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                          >
                            <option value="confirmado">confirmado</option>
                            <option value="pendente">pendente</option>
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                          <span>Notas (opcional)</span>
                          <input
                            value={pickNotas[f.id] ?? ""}
                            onChange={(e) => setPickNotas((p) => ({ ...p, [f.id]: e.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => addPessoa(f.id)}
                          disabled={saving}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #444",
                            background: saving ? "#222" : "#0f2a12",
                            color: "#fff"
                          }}
                        >
                          Adicionar
                        </button>

                        <button
                          onClick={() => setOpenAdd((p) => ({ ...p, [f.id]: false }))}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #444",
                            background: "#111",
                            color: "#fff"
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
