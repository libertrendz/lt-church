// app/cultos/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Ajusta para o teu helper real
import { createClient } from "@/lib/supabase/server";

type CultoCard = {
  eventoId: string;
  startsAt: string;
  endsAt?: string | null;
  titulo: string;
  congregacaoNome?: string | null;
  escalaId?: string | null;
  filled: number; // slots fechados
  total: number;  // total slots
};

function formatLisbon(dtIso: string) {
  const d = new Date(dtIso);
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function badge(filled: number, total: number) {
  if (!total) return { label: "Sem slots", tone: "neutral" as const };
  if (filled === 0) return { label: "Vazia", tone: "warn" as const };
  if (filled >= total) return { label: "Completa", tone: "ok" as const };
  return { label: "Em falta", tone: "warn" as const };
}

export default async function CultosPage() {
  const supabase = createClient(cookies());

  // 1) obter atividadeId do "Culto" (case-insensitive)
  const { data: cultoAtividade, error: eCulto } = await supabase
    .from("atividades")
    .select("id,nome")
    .ilike("nome", "culto")
    .limit(1)
    .maybeSingle();

  if (eCulto) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Cultos & Escalas</h1>
        <p className="mt-2 text-red-400">Erro a obter atividade "Culto".</p>
        <pre className="mt-2 text-xs opacity-70">{eCulto.message}</pre>
      </div>
    );
  }

  if (!cultoAtividade?.id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Cultos & Escalas</h1>
        <p className="mt-2 opacity-80">
          Não existe atividade com nome "Culto". Cria-a em Definições/Atividades.
        </p>
      </div>
    );
  }

  const nowIso = new Date().toISOString();

  // 2) eventos futuros do tipo Culto
  // Nota: ajusta campos conforme o teu schema real (starts_at/ends_at/titulo/congregacao_id etc.)
  const { data: eventos, error: eEventos } = await supabase
    .from("agenda_eventos")
    .select("id, starts_at, ends_at, titulo, congregacao_id")
    .eq("atividade_id", cultoAtividade.id)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (eEventos) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Cultos & Escalas</h1>
        <p className="mt-2 text-red-400">Erro a obter agenda_eventos.</p>
        <pre className="mt-2 text-xs opacity-70">{eEventos.message}</pre>
      </div>
    );
  }

  const eventoIds = (eventos ?? []).map((e) => e.id);
  if (!eventoIds.length) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Cultos & Escalas</h1>
        <p className="mt-2 opacity-80">Sem cultos futuros.</p>
      </div>
    );
  }

  // 3) escalas por evento_id
  const { data: escalas, error: eEscalas } = await supabase
    .from("escalas")
    .select("id, evento_id")
    .in("evento_id", eventoIds);

  if (eEscalas) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Cultos & Escalas</h1>
        <p className="mt-2 text-red-400">Erro a obter escalas.</p>
        <pre className="mt-2 text-xs opacity-70">{eEscalas.message}</pre>
      </div>
    );
  }

  const escalaByEvento = new Map<string, string>();
  (escalas ?? []).forEach((s) => {
    // se houver mais do que 1 por evento (não devia), ficamos com a primeira
    if (!escalaByEvento.has(s.evento_id)) escalaByEvento.set(s.evento_id, s.id);
  });

  const escalaIds = Array.from(new Set((escalas ?? []).map((s) => s.id)));
  const slotAggByEscala = new Map<string, { total: number; filled: number }>();

  // 4) slots para calcular filled/total via status
  if (escalaIds.length) {
    const { data: slots, error: eSlots } = await supabase
      .from("escala_slots")
      .select("escala_id, status")
      .in("escala_id", escalaIds);

    if (eSlots) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">Cultos & Escalas</h1>
          <p className="mt-2 text-red-400">Erro a obter escala_slots.</p>
          <pre className="mt-2 text-xs opacity-70">{eSlots.message}</pre>
        </div>
      );
    }

    for (const row of slots ?? []) {
      const cur = slotAggByEscala.get(row.escala_id) ?? { total: 0, filled: 0 };
      cur.total += 1;
      if ((row.status ?? "aberto") === "fechado") cur.filled += 1;
      slotAggByEscala.set(row.escala_id, cur);
    }
  }

  // (Opcional) resolver nomes de congregação, se existir tabela/conceito
  // Para não assumir schema, deixo simples: mostra só se tiveres congregacoes.
  const congregacaoIds = Array.from(
    new Set((eventos ?? []).map((e) => e.congregacao_id).filter(Boolean))
  ) as string[];

  const congregacaoNameById = new Map<string, string>();
  if (congregacaoIds.length) {
    const { data: congregacoes } = await supabase
      .from("congregacoes")
      .select("id,nome")
      .in("id", congregacaoIds);

    (congregacoes ?? []).forEach((c) => congregacaoNameById.set(c.id, c.nome));
  }

  const cards: CultoCard[] = (eventos ?? []).map((ev) => {
    const escalaId = escalaByEvento.get(ev.id) ?? null;
    const agg = escalaId ? slotAggByEscala.get(escalaId) : null;
    return {
      eventoId: ev.id,
      startsAt: ev.starts_at,
      endsAt: ev.ends_at,
      titulo: ev.titulo || "Culto",
      congregacaoNome: ev.congregacao_id ? congregacaoNameById.get(ev.congregacao_id) ?? null : null,
      escalaId,
      filled: agg?.filled ?? 0,
      total: agg?.total ?? 0,
    };
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Cultos & Escalas</h1>
        <p className="opacity-80">Próximos cultos (hora Europe/Lisbon)</p>
      </div>

      <div className="grid gap-3">
        {cards.map((c) => {
          const b = badge(c.filled, c.total);
          return (
            <div
              key={c.eventoId}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="text-sm opacity-80">{formatLisbon(c.startsAt)}</div>
                <div className="text-base font-semibold truncate">{c.titulo}</div>
                {c.congregacaoNome ? (
                  <div className="text-sm opacity-70 truncate">{c.congregacaoNome}</div>
                ) : null}

                <div className="mt-2 flex items-center gap-2">
                  {c.escalaId ? (
                    <>
                      <span className="text-sm">
                        Escala: <span className="font-semibold">{c.filled}/{c.total || 0}</span>
                      </span>
                      <span
                        className={[
                          "text-xs px-2 py-1 rounded-full border",
                          b.tone === "ok"
                            ? "border-emerald-400/30 text-emerald-200 bg-emerald-500/10"
                            : b.tone === "warn"
                            ? "border-amber-400/30 text-amber-200 bg-amber-500/10"
                            : "border-white/15 text-white/80 bg-white/5",
                        ].join(" ")}
                      >
                        {b.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm opacity-80">Escala: <span className="font-semibold">Sem escala</span></span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {c.escalaId ? (
                  <Link
                    href={`/escalas/${c.escalaId}`}
                    className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                  >
                    Gerir escala
                  </Link>
                ) : (
                  <form action={createEscalaForEvento}>
                    <input type="hidden" name="evento_id" value={c.eventoId} />
                    <button
                      className="rounded-xl px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/25 border border-emerald-400/20 text-sm"
                      type="submit"
                    >
                      Criar escala
                    </button>
                  </form>
                )}

                <Link
                  href={`/agenda?evento=${c.eventoId}`}
                  className="rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sm opacity-90"
                >
                  Ver evento
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Server Action ---
// Cria escala para o evento e redireciona para /escalas/[id]
async function createEscalaForEvento(formData: FormData) {
  "use server";
  const evento_id = String(formData.get("evento_id") ?? "");

  if (!evento_id) return;

  const supabase = createClient(cookies());

  // ⚠ Ajustar payload aos campos NOT NULL reais da tabela escalas.
  // Mínimo esperado: evento_id.
  const { data, error } = await supabase
    .from("escalas")
    .insert({ evento_id })
    .select("id")
    .single();

  if (error) {
    // não vamos “engolir” em silêncio: falha visível no server logs
    throw new Error(`Falha a criar escala: ${error.message}`);
  }

  redirect(`/escalas/${data.id}`);
}
