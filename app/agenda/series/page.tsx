"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type SerieRow = {
  id: string;
  dow: number | null;
  start_time: string | null; // "10:00:00"
  titulo_base: string | null;
  ativo: boolean;
  generate_weeks_ahead: number;
};

function dowLabel(dow: number | null) {
  switch (dow) {
    case 0:
      return "Domingo";
    case 1:
      return "Segunda";
    case 2:
      return "Terça";
    case 3:
      return "Quarta";
    case 4:
      return "Quinta";
    case 5:
      return "Sexta";
    case 6:
      return "Sábado";
    default:
      return "—";
  }
}

export default function AgendaSeriesPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [items, setItems] = useState<SerieRow[]>([]);
  const [workingId, setWorkingId] = useState<string | null>(null);

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

    const { data, error } = await supabase
      .from("agenda_series")
      .select("id, dow, start_time, titulo_base, ativo, generate_weeks_ahead")
      .order("dow", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setItems((data as SerieRow[]) ?? []);
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

  async function generate(serieId: string) {
    setWorkingId(serieId);
    setErr(null);
    setOk(null);

    const { data, error } = await supabase.rpc("generate_events_for_serie", {
      p_serie_id: serieId
    });

    setWorkingId(null);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(`Gerados ${data ?? 0} eventos.`);
  }

  async function toggleAtiva(s: SerieRow) {
    setWorkingId(s.id);
    setErr(null);
    setOk(null);

    const { error } = await supabase.rpc("set_agenda_serie_ativa", {
      p_serie_id: s.id,
      p_ativo: !s.ativo
    });

    setWorkingId(null);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(!s.ativo ? "Série ativada." : "Série inativada.");
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ marginTop: 0 }}>Agenda — Séries</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Séries recorrentes (P1): editar/inativar afecta apenas gerações futuras. Eventos já gerados não são alterados.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <a href="/agenda" style={{ color: "#fff", opacity: 0.9 }}>
          Ver eventos
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

      {!busy ? (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {items.map((s) => (
            <div
              key={s.id}
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid #333",
                background: "#0b0b0b",
                color: "#fff"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {s.titulo_base ?? "—"} {!s.ativo ? <span style={{ opacity: 0.75 }}>(inativa)</span> : null}
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    {dowLabel(s.dow)} às {s.start_time?.slice(0, 5) ?? "—"} · Gera {s.generate_weeks_ahead} semanas
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => generate(s.id)}
                    disabled={workingId === s.id || !s.ativo}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #444",
                      background: !s.ativo ? "#222" : "#0f2a12",
                      color: "#fff",
                      cursor: workingId === s.id || !s.ativo ? "not-allowed" : "pointer",
                      minWidth: 160
                    }}
                  >
                    {workingId === s.id ? "A gerar…" : "Gerar eventos"}
                  </button>

                  <button
                    onClick={() => toggleAtiva(s)}
                    disabled={workingId === s.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #444",
                      background: s.ativo ? "#2a0f0f" : "#111",
                      color: "#fff",
                      cursor: workingId === s.id ? "not-allowed" : "pointer",
                      minWidth: 140
                    }}
                  >
                    {s.ativo ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
