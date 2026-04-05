import { useAuth } from "@/_core/hooks/useAuth";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { useNexus, RANKS, getCurrentRank } from "@/contexts/NexusContext";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useCallback } from "react";
import { toast } from "sonner";

// ─── All achievement IDs ──────────────────────────────────────────────────────
const ALL_ACHIEVEMENTS = [
  "first_prompt", "focus_10", "focus_50", "tasks_10", "tasks_50",
  "streak_3", "streak_7", "rank_forma", "rank_autoria",
  "images_10", "focus_100h", "prompts_50",
];

// ─── All shop item IDs ────────────────────────────────────────────────────────
const ALL_PURCHASES = [
  "palette_warm", "palette_cold", "silhouette_angular", "effect_glow",
  "title_senior", "title_diretor",
  "feature_arquivo_filters", "feature_theme_alt", "feature_pulso_custom",
];

// ─── Max stats for "unlock all" ───────────────────────────────────────────────
const MAX_STATS = {
  pomodoroCompleted: 200,
  pomodoroAbandoned: 5,
  pomodoroTotalMin: 10000,
  tasksCompleted: 100,
  promptsGenerated: 100,
  promptsEdited: 50,
  imagesGenerated: 50,
  currentStreak: 30,
  bestStreak: 30,
  lastSessionDate: new Date().toISOString().split("T")[0]!,
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const RANK_NAMES = ["RASCUNHO", "ESBOÇO", "FORMA", "TRAÇO", "COMPOSIÇÃO", "AUTORIA", "CÓRTEX"];

// ─── Stat badge ───────────────────────────────────────────────────────────────
function StatBadge({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? "rgba(255,255,255,0.06)" : "var(--surface)",
      border: `1px solid ${highlight ? "rgba(255,255,255,0.2)" : "var(--border)"}`,
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 32, letterSpacing: 2, color: highlight ? "#fff" : "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "var(--dim)", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children, accent = false }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{
        fontFamily: "DM Mono, monospace",
        fontSize: 9,
        letterSpacing: 4,
        color: accent ? "rgba(255,255,255,0.5)" : "var(--dim)",
        textTransform: "uppercase",
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: `1px solid ${accent ? "rgba(255,255,255,0.15)" : "var(--border)"}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({
  label, onClick, disabled = false, variant = "default", size = "md",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}) {
  const colors = {
    default: { border: "var(--border)", color: "var(--dim)" },
    primary: { border: "rgba(255,255,255,0.6)", color: "rgba(255,255,255,0.9)" },
    danger:  { border: "rgba(255,80,80,0.5)",  color: "rgba(255,80,80,0.8)" },
    success: { border: "rgba(80,255,120,0.5)", color: "rgba(80,255,120,0.8)" },
  };
  const sizes = { sm: "6px 14px", md: "10px 20px", lg: "14px 32px" };
  const c = colors[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: `1px solid ${disabled ? "var(--border)" : c.border}`,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "DM Mono, monospace",
        fontSize: 9,
        letterSpacing: 3,
        color: disabled ? "var(--dim)" : c.color,
        padding: sizes[size],
        textTransform: "uppercase",
        transition: "all 0.2s",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ─── Main Admin ───────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const { navigateTo } = usePageTransition();
  const { nexus, updateNexus, addXP, syncWithDB } = useNexus();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editXp, setEditXp] = useState("");
  const [editGlifos, setEditGlifos] = useState("");
  const [editRank, setEditRank] = useState("1");
  const [simCount, setSimCount] = useState(5);
  const [simDur, setSimDur] = useState<25 | 50>(25);
  const [busy, setBusy] = useState<string | null>(null);

  const statsQuery = trpc.cortex.admin.getStats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const usersQuery = trpc.cortex.admin.getAllUsers.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const setXpMut = trpc.cortex.admin.setUserXP.useMutation();
  const resetMut = trpc.cortex.admin.resetUser.useMutation();
  const simMut = trpc.cortex.admin.simulateSessions.useMutation();
  const utils = trpc.useUtils();

  const currentRank = getCurrentRank(nexus.xp);

  // ── Local NEXUS test actions ──────────────────────────────────────────────
  const handleMaxXP = useCallback(() => {
    setBusy("xp");
    updateNexus(prev => ({ ...prev, xp: 30000, rankId: 7 }));
    syncWithDB();
    toast.success("XP máximo aplicado — Rank CÓRTEX desbloqueado");
    setBusy(null);
  }, [updateNexus, syncWithDB]);

  const handleMaxGlifos = useCallback(() => {
    setBusy("glifos");
    updateNexus(prev => ({ ...prev, glifos: 9999 }));
    syncWithDB();
    toast.success("9999 glifos adicionados");
    setBusy(null);
  }, [updateNexus, syncWithDB]);

  const handleUnlockAll = useCallback(() => {
    setBusy("unlock");
    updateNexus(prev => ({
      ...prev,
      xp: 30000,
      glifos: 9999,
      rankId: 7,
      achievements: [...ALL_ACHIEVEMENTS],
      purchases: [...ALL_PURCHASES],
      agentAppearance: {
        paletteId: "palette_warm",
        silhouetteId: "silhouette_angular",
        effectId: "effect_glow",
        titleId: "title_diretor",
      },
      stats: { ...prev.stats, ...MAX_STATS },
    }));
    syncWithDB();
    toast.success("Tudo desbloqueado — XP, glifos, conquistas e loja no máximo");
    setBusy(null);
  }, [updateNexus, syncWithDB]);

  const handleReset = useCallback(() => {
    if (!confirm("Resetar TUDO? XP, glifos, conquistas e compras serão zerados.")) return;
    setBusy("reset");
    updateNexus(() => ({
      agentName: nexus.agentName,
      agentAppearance: { paletteId: null, silhouetteId: null, effectId: null, titleId: null },
      xp: 0,
      glifos: 0,
      rankId: 1,
      stats: {
        pomodoroCompleted: 0, pomodoroAbandoned: 0, pomodoroTotalMin: 0,
        tasksCompleted: 0, promptsGenerated: 0, promptsEdited: 0,
        imagesGenerated: 0, currentStreak: 0, bestStreak: 0, lastSessionDate: null,
      },
      achievements: [],
      purchases: [],
      activeItems: [],
    }));
    syncWithDB();
    toast.success("NEXUS resetado para o estado inicial");
    setBusy(null);
  }, [updateNexus, syncWithDB, nexus.agentName]);

  const handleAddXP = useCallback((amount: number) => {
    for (let i = 0; i < Math.ceil(amount / 100); i++) {
      addXP("pomodoro_50min");
    }
    toast.success(`+${amount} XP adicionados`);
  }, [addXP]);

  // ── DB admin actions ──────────────────────────────────────────────────────
  const handleSelectUser = (u: { id: number; xp: number | null; glifos: number | null; rankId: number | null }) => {
    setSelectedUserId(u.id);
    setEditXp(String(u.xp ?? 0));
    setEditGlifos(String(u.glifos ?? 0));
    setEditRank(String(u.rankId ?? 1));
  };

  const handleSetXP = async () => {
    if (!selectedUserId) return;
    try {
      await setXpMut.mutateAsync({ targetUserId: selectedUserId, xp: parseInt(editXp) || 0, glifos: parseInt(editGlifos) || 0, rankId: parseInt(editRank) || 1 });
      await utils.cortex.admin.getAllUsers.invalidate();
      toast.success("XP atualizado no banco");
    } catch { toast.error("Erro ao atualizar XP"); }
  };

  const handleResetUser = async (targetId: number) => {
    if (!confirm("Resetar este usuário no banco?")) return;
    try {
      await resetMut.mutateAsync({ targetUserId: targetId });
      await utils.cortex.admin.getAllUsers.invalidate();
      toast.success("Usuário resetado");
    } catch { toast.error("Erro ao resetar"); }
  };

  const handleSimulate = async () => {
    try {
      const res = await simMut.mutateAsync({ count: simCount, durationMin: simDur });
      await utils.cortex.admin.getStats.invalidate();
      toast.success(`${simCount} sessões simuladas — +${res.xpGained} XP, +${res.glifosGained} Glifos`);
    } catch { toast.error("Erro ao simular sessões"); }
  };

  // ── Auth guards ───────────────────────────────────────────────────────────
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
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, letterSpacing: 8, color: "var(--text)" }}>ADMIN</div>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 3, color: "var(--dim)" }}>ACESSO RESTRITO</div>
        <a href={getLoginUrl()} style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 3, color: "var(--text)", border: "1px solid var(--border)", padding: "12px 24px", textDecoration: "none" }}>ENTRAR</a>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, letterSpacing: 8, color: "var(--text)" }}>ACESSO NEGADO</div>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 3, color: "var(--dim)" }}>REQUER ROLE: ADMIN</div>
        <ActionBtn label="← Voltar" onClick={() => navigateTo("/")} />
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)",
    fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: 1, padding: "8px 12px",
    outline: "none", width: "100%",
  };

  const allUsers = usersQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigateTo("/")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: "var(--dim)", padding: 0 }}>← CÓRTEX</button>
        <div style={{ flex: 1, fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: 6, color: "var(--text)" }}>ADMIN</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2, color: "var(--dim)" }}>{user?.name?.toUpperCase()}</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.08)", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.15)" }}>ADMIN</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>

        {/* ── ESTADO ATUAL DO NEXUS ── */}
        <Section title="Estado atual do NEXUS (sua conta)" accent>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 16 }}>
            <StatBadge label="XP Total" value={nexus.xp.toLocaleString()} highlight />
            <StatBadge label="Glifos" value={nexus.glifos.toLocaleString()} highlight />
            <StatBadge label="Rank" value={currentRank.name} highlight />
            <StatBadge label="Conquistas" value={`${nexus.achievements.length} / ${ALL_ACHIEVEMENTS.length}`} highlight />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
            <StatBadge label="Compras" value={`${nexus.purchases.length} / ${ALL_PURCHASES.length}`} />
            <StatBadge label="Sessões" value={nexus.stats.pomodoroCompleted} />
            <StatBadge label="Imagens Geradas" value={nexus.stats.imagesGenerated} />
            <StatBadge label="Prompts" value={nexus.stats.promptsGenerated} />
          </div>
        </Section>

        {/* ── AÇÕES DE TESTE RÁPIDO ── */}
        <Section title="Ações de teste rápido" accent>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <ActionBtn
              label="⬆ DESBLOQUEAR TUDO"
              onClick={handleUnlockAll}
              disabled={busy === "unlock"}
              variant="primary"
              size="lg"
            />
            <ActionBtn
              label="XP MÁXIMO (30.000)"
              onClick={handleMaxXP}
              disabled={busy === "xp"}
              variant="primary"
            />
            <ActionBtn
              label="GLIFOS MÁXIMOS (9.999)"
              onClick={handleMaxGlifos}
              disabled={busy === "glifos"}
              variant="success"
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {[100, 500, 1000, 5000].map(amount => (
              <ActionBtn
                key={amount}
                label={`+${amount} XP`}
                onClick={() => handleAddXP(amount)}
                variant="default"
                size="sm"
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionBtn
              label="RESETAR TUDO"
              onClick={handleReset}
              disabled={busy === "reset"}
              variant="danger"
            />
          </div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 2, color: "var(--dim)", marginTop: 12 }}>
            "DESBLOQUEAR TUDO" aplica XP máximo, 9999 glifos, todas as conquistas, todos os itens da loja e aparência completa do AGENTE.
          </div>
        </Section>

        {/* ── SIMULAR SESSÕES ── */}
        <Section title="Simular sessões PULSO (banco de dados)">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {([1, 5, 20] as const).map(n => (
                <button key={n} onClick={() => setSimCount(n)} style={{ background: "none", border: `1px solid ${simCount === n ? "var(--text)" : "var(--border)"}`, cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: simCount === n ? "var(--text)" : "var(--dim)", padding: "8px 16px" }}>
                  {n}×
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {([25, 50] as const).map(d => (
                <button key={d} onClick={() => setSimDur(d)} style={{ background: "none", border: `1px solid ${simDur === d ? "var(--text)" : "var(--border)"}`, cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: simDur === d ? "var(--text)" : "var(--dim)", padding: "8px 16px" }}>
                  {d}min
                </button>
              ))}
            </div>
            <ActionBtn label={simMut.isPending ? "SIMULANDO..." : "EXECUTAR"} onClick={handleSimulate} disabled={simMut.isPending} variant="primary" />
          </div>
        </Section>

        {/* ── SISTEMA ── */}
        <Section title="Estatísticas do sistema">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            <StatBadge label="Usuários totais" value={stats?.totalUsers ?? "—"} />
            <StatBadge label="Sessões hoje" value={stats?.sessionsToday ?? "—"} />
            <StatBadge label="Sessões esta semana" value={stats?.sessionsWeek ?? "—"} />
          </div>
        </Section>

        {/* ── EDITAR XP DE USUÁRIO ── */}
        <Section title="Editar XP / glifos de usuário (banco)">
          {selectedUserId ? (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 2, color: "var(--dim)", marginBottom: 6 }}>XP</div>
                <input value={editXp} onChange={e => setEditXp(e.target.value)} style={inputStyle} type="number" min={0} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 2, color: "var(--dim)", marginBottom: 6 }}>GLIFOS</div>
                <input value={editGlifos} onChange={e => setEditGlifos(e.target.value)} style={inputStyle} type="number" min={0} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 2, color: "var(--dim)", marginBottom: 6 }}>RANK</div>
                <select value={editRank} onChange={e => setEditRank(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {RANK_NAMES.map((r, i) => <option key={r} value={i + 1}>{i + 1} — {r}</option>)}
                </select>
              </div>
              <ActionBtn label={setXpMut.isPending ? "SALVANDO..." : "SALVAR"} onClick={handleSetXP} disabled={setXpMut.isPending} variant="primary" />
              <ActionBtn label="CANCELAR" onClick={() => setSelectedUserId(null)} />
            </div>
          ) : (
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "var(--dim)" }}>
              Selecione um usuário na tabela abaixo.
            </div>
          )}
        </Section>

        {/* ── TABELA DE USUÁRIOS ── */}
        <Section title={`Usuários (${allUsers.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "DM Mono, monospace", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["ID", "NOME", "ROLE", "XP", "GLIFOS", "RANK", "CRIADO", "AÇÕES"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--dim)", letterSpacing: 2, fontWeight: "normal", fontSize: 8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", background: selectedUserId === u.id ? "rgba(255,255,255,0.04)" : "transparent" }}>
                    <td style={{ padding: "10px 12px", color: "var(--dim)" }}>{u.id}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text)" }}>{u.name ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ color: u.role === "admin" ? "#fff" : "var(--dim)", border: u.role === "admin" ? "1px solid rgba(255,255,255,0.3)" : "none", padding: u.role === "admin" ? "2px 6px" : 0 }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--mid)" }}>{u.xp ?? 0}</td>
                    <td style={{ padding: "10px 12px", color: "var(--mid)" }}>{u.glifos ?? 0}</td>
                    <td style={{ padding: "10px 12px", color: "var(--dim)" }}>{RANK_NAMES[(u.rankId ?? 1) - 1]}</td>
                    <td style={{ padding: "10px 12px", color: "var(--dim)" }}>{fmtDate(u.createdAt)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <ActionBtn label="EDITAR" onClick={() => handleSelectUser(u)} size="sm" />
                        {u.id !== user?.id && (
                          <ActionBtn label="RESET" onClick={() => handleResetUser(u.id)} size="sm" variant="danger" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── ATALHOS ── */}
        <Section title="Atalhos de navegação">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "→ LANDING", path: "/" },
              { label: "→ ARQUIVO", path: "/arquivo" },
              { label: "→ NEXUS", path: "/nexus" },
              { label: "→ DASHBOARD", path: "/dashboard" },
            ].map(l => (
              <ActionBtn key={l.path} label={l.label} onClick={() => navigateTo(l.path)} variant="default" />
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}
