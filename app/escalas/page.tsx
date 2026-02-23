/* PATH: app/escalas/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type EventoRow = {
  id: string;
  starts_at: string | null;
  titulo: string | null;
  status: "agendado" | "cancelado";
};

function fmtLisbon(iso: string | null) {
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

export default function EscalasHomePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [selectedEventoId, setSelectedEventoId] = useState<string>("");
  const [working, setWorking] = useState(false);

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
      .from("agenda_eventos")
      .select("id, starts_at, titulo, status")
      .order("starts_at", { ascending: true })
      .limit(200);

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setEventos((data as EventoRow[]) ?? []);
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

  async function openOrCreateEscala() {
    setWorking(true);
    setErr(null);
    setOk(null);

    if (!selectedEventoId) {
      setWorking(false);
      setErr("Seleciona um evento.");
      return;
    }

    const existing = await supabase
      .from("escalas")
      .select("id, evento_id")
      .eq("evento_id", selectedEventoId)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      setWorking(false);
      setErr(existing.error.message);
      return;
    }

    if (existing.data?.id) {
      router.push(`/escalas/${existing.data.id}`);
      return;
    }

    // titulo útil: copia do evento (não é obrigatório)
    const ev = eventos.find((e) => e.id === selectedEventoId);
    const tituloSug = ev?.titulo?.trim() ? `Escala — ${ev.titulo}` : "Escala";

    const ins = await supabase
      .from("escalas")
      .insert({ evento_id: selectedEventoId, titulo: tituloSug })
      .select("id, evento_id")
      .single();

    setWorking(false);

    if (ins.error) {
      setErr(ins.error.message);
      return;
    }

    setOk("Escala criada.");
    router.push(`/escalas/${ins.data.id}`);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, color: "#fff" }}>
      <h1 style={{ marginTop: 0 }}>Escalas</h1>
      <p style={{ opacity: 0.85, marginTop: 6 }}>
        Escolhe um evento e abre/cria a escala (1 escala por evento).
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <a href="/agenda" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Ver agenda
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
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #333",
            background: "#0b0b0b"
          }}
        >
          <label style={{ display: "grid", gap: 8, maxWidth: 720 }}>
            <span>Evento</span>
            <select
              value={selectedEventoId}
              onChange={(e) => setSelectedEventoId(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "#111",
                color: "#fff"
              }}
            >
              <option value="">—</option>
              {eventos.map((ev) => {
                const label = `${fmtLisbon(ev.starts_at)} · ${ev.titulo ?? "Evento"}${
                  ev.status === "cancelado" ? " (cancelado)" : ""
                }`;
                return (
                  <option key={ev.id} value={ev.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>

          <button
            onClick={openOrCreateEscala}
            disabled={working}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #444",
              background: working ? "#222" : "#111",
              color: "#fff",
              cursor: working ? "not-allowed" : "pointer",
              width: 220
            }}
          >
            {working ? "A abrir…" : "Abrir / criar escala"}
          </button>
        </div>
      ) : null}
    </main>
  );
}
