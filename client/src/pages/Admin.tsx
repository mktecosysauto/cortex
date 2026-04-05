import { useAuth } from "@/_core/hooks/useAuth";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const RANKS = ["INICIANTE", "APRENDIZ", "CRIADOR", "ARTESÃO", "MESTRE", "VISIONÁRIO", "LENDÁRIO"];

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const { navigateTo } = usePageTransition();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editXp, setEditXp] = useState("");
  const [editGlifos, setEditGlifos] = useState("");
  const [editRank, setEditRank] = useState("1");
  const [simCount, setSimCount] = useState(5);
  const [simDur, setSimDur] = useState<25 | 50>(25);

  const statsQuery = trpc.cortex.admin.getStats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const usersQuery = trpc.cortex.admin.getAllUsers.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const setXpMut = trpc.cortex.admin.setUserXP.useMutation();
  const resetMut = trpc.cortex.admin.resetUser.useMutation();
  const simMut = trpc.cortex.admin.simulateSessions.useMutation();
  const utils = trpc.useUtils();

  const handleSelectUser = (u: { id: number; xp: number | null; glifos: number | null; rankId: number | null }) => {
    setSelectedUserId(u.id);
    setEditXp(String(u.xp ?? 0));
    setEditGlifos(String(u.glifos ?? 0));
    setEditRank(String(u.rankId ?? 1));
  };

  const handleSetXP = async () => {
    if (!selectedUserId) return;
    try {
      await setXpMut.mutateAsync({
        targetUserId: selectedUserId,
        xp: parseInt(editXp) || 0,
        glifos: parseInt(editGlifos) || 0,
        rankId: parseInt(editRank) || 1,
      });
      await utils.cortex.admin.getAllUsers.invalidate();
      toast.success("XP atualizado");
    } catch {
      toast.error("Erro ao atualizar XP");
    }
  };

  const handleReset = async (targetId: number) => {
    if (!confirm("Resetar este usuário? Esta ação não pode ser desfeita.")) return;
    try {
      await resetMut.mutateAsync({ targetUserId: targetId });
      await utils.cortex.admin.getAllUsers.invalidate();
      toast.success("Usuário resetado");
    } catch {
      toast.error("Erro ao resetar");
    }
  };

  const handleSimulate = async () => {
    try {
      const res = await simMut.mutateAsync({ count: simCount, durationMin: simDur });
      await utils.cortex.admin.getStats.invalidate();
      toast.success(`${simCount} sessões simuladas — +${res.xpGained} XP, +${res.glifosGained} Glifos`);
    } catch {
      toast.error("Erro ao simular sessões");
    }
  };

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
        <a href={getLoginUrl()} style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 3, color: "var(--text)", border: "1px solid var(--border)", padding: "12px 24px", textDecoration: "none" }}>ENTRAR</a>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, letterSpacing: 8, color: "var(--text)" }}>ACESSO NEGADO</div>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: 3, color: "var(--dim)" }}>REQUER ROLE: ADMIN</div>
        <button onClick={() => navigateTo("/")} style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: "var(--dim)", padding: "10px 20px" }}>← VOLTAR</button>
      </div>
    );
  }

  const stats = statsQuery.data;
  const allUsers = usersQuery.data ?? [];

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)",
    fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: 1, padding: "8px 12px",
    outline: "none", width: "100%",
  };
  const btnStyle: React.CSSProperties = {
    background: "none", border: "1px solid var(--border)", cursor: "pointer",
    fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: "var(--dim)",
    padding: "10px 20px", textTransform: "uppercase" as const, transition: "all 0.2s",
  };
  const btnPrimary: React.CSSProperties = { ...btnStyle, borderColor: "var(--text)", color: "var(--text)" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigateTo("/")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 3, color: "var(--dim)", padding: 0 }}>← CÓRTEX</button>
        <div style={{ flex: 1, fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: 6, color: "var(--text)" }}>ADMIN</div>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2, color: "var(--dim)", background: "var(--surface)", padding: "4px 8px" }}>ROLE: ADMIN</span>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>

        {/* Stats */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 4, color: "var(--dim)", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
            ESTATÍSTICAS DO SISTEMA
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {[
              { label: "USUÁRIOS TOTAIS", value: String(stats?.totalUsers ?? "—") },
              { label: "SESSÕES HOJE", value: String(stats?.sessionsToday ?? "—") },
              { label: "SESSÕES ESTA SEMANA", value: String(stats?.sessionsWeek ?? "—") },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px 24px" }}>
                <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 40, letterSpacing: 2, color: "var(--text)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "var(--dim)", textTransform: "uppercase", marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulate Sessions */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 4, color: "var(--dim)", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
            SIMULAR SESSÕES (CONTA ATUAL)
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {([1, 5, 20] as const).map(n => (
                <button key={n} onClick={() => setSimCount(n)} style={{ ...btnStyle, borderColor: simCount === n ? "var(--text)" : "var(--border)", color: simCount === n ? "var(--text)" : "var(--dim)" }}>
                  {n}x
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {([25, 50] as const).map(d => (
                <button key={d} onClick={() => setSimDur(d)} style={{ ...btnStyle, borderColor: simDur === d ? "var(--text)" : "var(--border)", color: simDur === d ? "var(--text)" : "var(--dim)" }}>
                  {d}min
                </button>
              ))}
            </div>
            <button onClick={handleSimulate} disabled={simMut.isPending} style={btnPrimary}>
              {simMut.isPending ? "SIMULANDO..." : "EXECUTAR"}
            </button>
          </div>
        </div>

        {/* Edit User XP */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 4, color: "var(--dim)", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
            EDITAR XP / GLIFOS
          </div>
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
                  {RANKS.map((r, i) => <option key={r} value={i + 1}>{i + 1} — {r}</option>)}
                </select>
              </div>
              <button onClick={handleSetXP} disabled={setXpMut.isPending} style={btnPrimary}>SALVAR</button>
              <button onClick={() => setSelectedUserId(null)} style={btnStyle}>CANCELAR</button>
            </div>
          ) : (
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "var(--dim)" }}>
              Selecione um usuário na tabela abaixo para editar.
            </div>
          )}
        </div>

        {/* Users Table */}
        <div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 4, color: "var(--dim)", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
            USUÁRIOS ({allUsers.length})
          </div>
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
                      <span style={{ color: u.role === "admin" ? "var(--text)" : "var(--dim)", border: u.role === "admin" ? "1px solid var(--border)" : "none", padding: u.role === "admin" ? "2px 6px" : 0 }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--mid)" }}>{u.xp ?? 0}</td>
                    <td style={{ padding: "10px 12px", color: "var(--mid)" }}>{u.glifos ?? 0}</td>
                    <td style={{ padding: "10px 12px", color: "var(--dim)" }}>{RANKS[(u.rankId ?? 1) - 1]}</td>
                    <td style={{ padding: "10px 12px", color: "var(--dim)" }}>{fmtDate(u.createdAt)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleSelectUser(u)} style={{ ...btnStyle, padding: "4px 10px", fontSize: 8 }}>EDITAR</button>
                        {u.id !== user?.id && (
                          <button onClick={() => handleReset(u.id)} style={{ ...btnStyle, padding: "4px 10px", fontSize: 8, color: "rgba(255,80,80,0.6)", borderColor: "rgba(255,80,80,0.3)" }}>RESET</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
