import { useAuth } from "@/_core/hooks/useAuth";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function getWeekLabel(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} — ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { date: string; minutes: number }[] }) {
  const maxMin = Math.max(...data.map(d => d.minutes), 1);
  const days = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(data[0]?.date + "T00:00:00" || new Date());
    d.setDate(d.getDate() - d.getDay() + 1 + i);
    const iso = d.toISOString().split("T")[0]!;
    const found = data.find(x => x.date === iso);
    return { day: days[i]!, minutes: found?.minutes ?? 0, iso };
  });

  return (
    <svg viewBox="0 0 420 120" style={{ width: "100%", height: "auto" }}>
      {weekDays.map((d, i) => {
        const barH = Math.max((d.minutes / maxMin) * 80, d.minutes > 0 ? 2 : 0);
        const x = 10 + i * 58;
        return (
          <g key={d.iso}>
            <rect x={x} y={100 - barH} width={40} height={barH} fill="var(--text)" opacity={d.minutes > 0 ? 0.9 : 0.1} />
            <text x={x + 20} y={115} textAnchor="middle" fontSize={8} fill="var(--dim)" fontFamily="DM Mono, monospace" letterSpacing={1}>
              {d.day.toUpperCase()}
            </text>
            {d.minutes > 0 && (
              <text x={x + 20} y={95 - barH} textAnchor="middle" fontSize={7} fill="var(--mid)" fontFamily="DM Mono, monospace">
                {fmtMin(d.minutes)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} y1={100} x2={420} y2={100} stroke="var(--border)" strokeWidth={1} />
    </svg>
  );
}

// ─── Heat Map ─────────────────────────────────────────────────────────────────
function HeatMap({ data }: { data: Record<string, number> }) {
  const cells = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    const iso = d.toISOString().split("T")[0]!;
    const min = data[iso] ?? 0;
    const opacity = min === 0 ? 0.06 : Math.min(0.15 + (min / 120) * 0.85, 1);
    return { iso, min, opacity };
  });

  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {cells.map(c => (
        <div
          key={c.iso}
          title={`${c.iso}: ${fmtMin(c.min)}`}
          style={{
            width: 16, height: 16,
            background: `rgba(255,255,255,${c.opacity})`,
            cursor: "default",
            transition: "opacity 0.2s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Tool Bar ─────────────────────────────────────────────────────────────────
function ToolBar({ tool, minutes, maxMin }: { tool: string; minutes: number; maxMin: number }) {
  const pct = maxMin > 0 ? (minutes / maxMin) * 100 : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 14, letterSpacing: 3, color: "var(--text)" }}>
        {tool.toUpperCase()}
      </span>
      <div style={{ height: 2, background: "var(--border)" }}>
        <div style={{ height: "100%", background: "var(--text)", width: `${pct}%`, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "var(--dim)", letterSpacing: 1, textAlign: "right" }}>
        {fmtMin(minutes)}
      </span>
    </div>
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────────────
function TimelineItem({ session }: { session: {
  id: number; startedAt: Date; completedAt?: Date | null;
  durationMin: number; status: string; taskName?: string | null; toolActive?: string | null; xpEarned: number;
}}) {
  const icon = session.status === "completed" ? "●" : "○";
  const date = new Date(session.startedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "16px 130px 1fr 48px 60px",
      gap: 12, alignItems: "center", padding: "8px 0",
      borderBottom: "1px solid var(--border)",
      fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 1,
      opacity: session.status === "abandoned" ? 0.4 : 1,
    }}>
      <span style={{ color: "var(--text)" }}>{icon}</span>
      <span style={{ color: "var(--dim)" }}>{date}</span>
      <span style={{ color: "var(--mid)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {session.taskName ?? "—"}
      </span>
      <span style={{ color: "var(--dim)", textAlign: "right" }}>{fmtMin(session.durationMin)}</span>
      <span style={{ color: "var(--dim)", fontSize: 9 }}>{session.toolActive?.toUpperCase() ?? "—"}</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      padding: "20px 24px",
    }}>
      <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 36, letterSpacing: 2, color: "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "var(--dim)", textTransform: "uppercase", marginTop: 6 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 2, color: "var(--dim)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 4, color: "var(--dim)", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const { navigateTo } = usePageTransition();
  const [weekOffset, setWeekOffset] = useState(0);
  const [generatingInsight, setGeneratingInsight] = useState(false);

  const { weekStart, weekEnd } = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

  const weekData = trpc.cortex.dashboard.getWeekData.useQuery(
    { weekStart, weekEnd },
    { enabled: isAuthenticated }
  );
  const last30 = trpc.cortex.dashboard.getLast30Days.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const leaderboard = trpc.cortex.dashboard.getLeaderboard.useQuery();
  const weeklyInsight = trpc.cortex.dashboard.getWeeklyInsight.useQuery(
    { weekStart },
    { enabled: isAuthenticated }
  );
  const generateInsightMut = trpc.cortex.dashboard.generateInsight.useMutation();
  const utils = trpc.useUtils();

  const handleGenerateInsight = useCallback(async () => {
    if (!weekData.data) return;
    setGeneratingInsight(true);
    try {
      await generateInsightMut.mutateAsync({
        weekStart,
        statsSnapshot: {
          focusMinutes: weekData.data.focusMinutes,
          sessionsDone: weekData.data.sessionsDone,
          sessionsAbandoned: weekData.data.sessionsAbandoned,
          xpEarned: weekData.data.xpEarned,
          bestDay: weekData.data.bestDay,
          dailyBreakdown: weekData.data.dailyBreakdown,
        },
      });
      await utils.cortex.dashboard.getWeeklyInsight.invalidate();
      toast.success("Insight gerado");
    } catch {
      toast.error("Erro ao gerar insight");
    } finally {
      setGeneratingInsight(false);
    }
  }, [weekData.data, weekStart, generateInsightMut, utils]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 4, color: "var(--dim)" }}>CARREGANDO...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, letterSpacing: 8, color: "var(--text)" }}>DASHBOARD</div>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 3, color: "var(--dim)" }}>ACESSO RESTRITO</div>
        <a href={getLoginUrl()} style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 3, color: "var(--text)", border: "1px solid var(--border)", padding: "12px 24px", textDecoration: "none" }}>
          ENTRAR
        </a>
      </div>
    );
  }

  const d = weekData.data;
  const maxToolMin = d ? Math.max(...(d.toolBreakdown.map(t => t.minutes)), 1) : 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigateTo("/")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: "var(--dim)", padding: 0 }}>
          ← CÓRTEX
        </button>
        <div style={{ flex: 1, fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: 6, color: "var(--text)" }}>
          DASHBOARD
        </div>
        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer", color: "var(--dim)", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>←</button>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2, color: "var(--mid)", minWidth: 140, textAlign: "center" }}>
            {getWeekLabel(weekStart)}
          </span>
          <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset === 0} style={{ background: "none", border: "1px solid var(--border)", cursor: weekOffset === 0 ? "default" : "pointer", color: weekOffset === 0 ? "var(--border)" : "var(--dim)", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>→</button>
        </div>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2, color: "var(--dim)" }}>
          {user?.name?.toUpperCase()}
        </span>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        {/* Stat Cards */}
        <Section title="Resumo da semana">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 2 }}>
            <StatCard label="Foco total" value={d ? fmtMin(d.focusMinutes) : "—"} />
            <StatCard label="Sessões" value={d ? String(d.sessionsDone) : "—"} sub={d && d.sessionsAbandoned > 0 ? `${d.sessionsAbandoned} abandonadas` : undefined} />
            <StatCard label="XP ganho" value={d ? `+${d.xpEarned}` : "—"} />
            <StatCard label="Glifos" value={d ? `+${d.glifosEarned}` : "—"} />
          </div>
          {d?.bestDay && (
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 2, color: "var(--mid)", padding: "10px 0", borderTop: "1px solid var(--border)", textTransform: "uppercase" }}>
              Melhor dia: {fmtDate(d.bestDay)} — {fmtMin(d.dailyBreakdown.find(x => x.date === d.bestDay)?.minutes ?? 0)}
            </div>
          )}
        </Section>

        {/* Bar Chart */}
        <Section title="Foco por dia">
          {d && d.dailyBreakdown.length > 0 ? (
            <BarChart data={d.dailyBreakdown} />
          ) : (
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "var(--dim)", padding: "24px 0" }}>
              Nenhuma sessão nesta semana.
            </div>
          )}
        </Section>

        {/* Heatmap */}
        <Section title="Atividade — 30 dias">
          <HeatMap data={last30.data ?? {}} />
        </Section>

        {/* Tool Breakdown */}
        {d && d.toolBreakdown.length > 0 && (
          <Section title="Foco por ferramenta">
            {d.toolBreakdown.map(t => (
              <ToolBar key={t.tool} tool={t.tool} minutes={t.minutes} maxMin={maxToolMin} />
            ))}
          </Section>
        )}

        {/* Timeline */}
        {d && d.sessions.length > 0 && (
          <Section title="Linha do tempo">
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {d.sessions.map(s => (
                <TimelineItem key={s.id} session={s} />
              ))}
            </div>
          </Section>
        )}

        {/* Insight IA */}
        <Section title="Insight da semana">
          {weeklyInsight.data ? (
            <div style={{ background: "var(--surface)", borderLeft: "2px solid var(--border)", padding: "16px 20px" }}>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, color: "var(--dim)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                ANÁLISE IA — {new Date(weeklyInsight.data.generatedAt).toLocaleDateString("pt-BR")}
              </div>
              <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "var(--mid)", lineHeight: 1.7 }}>
                {weeklyInsight.data.insightText}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "var(--dim)" }}>
                Nenhum insight para esta semana.
              </div>
              {d && d.sessionsDone > 0 && (
                <button
                  onClick={handleGenerateInsight}
                  disabled={generatingInsight}
                  style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: "var(--dim)", padding: "8px 16px", textTransform: "uppercase" }}
                >
                  {generatingInsight ? "GERANDO..." : "GERAR INSIGHT"}
                </button>
              )}
            </div>
          )}
        </Section>

        {/* Leaderboard */}
        <Section title="Ranking">
          {(leaderboard.data ?? []).map((entry, i) => (
            <div key={entry.id} style={{
              display: "grid", gridTemplateColumns: "32px 1fr 120px 100px",
              gap: 12, alignItems: "center", padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              fontFamily: "DM Mono, monospace", fontSize: 10,
              background: entry.id === user?.id ? "rgba(255,255,255,0.03)" : "transparent",
            }}>
              <span style={{ color: "var(--dim)", letterSpacing: 1 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ color: "var(--text)", letterSpacing: 2 }}>{entry.agentName ?? "AGENTE"}</span>
              <span style={{ color: "var(--dim)" }}>{entry.name ?? "—"}</span>
              <span style={{ color: "var(--mid)", textAlign: "right" }}>{entry.xp} XP</span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
