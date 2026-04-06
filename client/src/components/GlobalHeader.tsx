import { useEffect, useRef, useState } from "react";
import { useNexus } from "@/contexts/NexusContext";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── PULSO State (sessionStorage) ────────────────────────────────────────────
interface PulsoState {
  status: "idle" | "running" | "paused" | "done";
  duration: number;
  remaining: number;
  taskName: string;
  streakCount: number;
}

const PULSO_KEY = "cortex_pulso_state";

function savePulsoState(s: PulsoState) {
  sessionStorage.setItem(PULSO_KEY, JSON.stringify(s));
}

function loadPulsoState(): PulsoState | null {
  try {
    const raw = sessionStorage.getItem(PULSO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── ROTA Rewards ─────────────────────────────────────────────────────────────
const ROTA_REWARDS: Record<string, { xp: number; glifos: number }> = {
  facil:    { xp: 20,  glifos: 15  },
  media:    { xp: 50,  glifos: 35  },
  dificil:  { xp: 120, glifos: 80  },
  lendaria: { xp: 300, glifos: 200 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── GlobalHeader ─────────────────────────────────────────────────────────────
export function GlobalHeader({ currentPage }: { currentPage: "home" | "arquivo" | "nexus" | "dashboard" | "admin" }) {
  const { navigateTo } = usePageTransition();
  const { user, isAuthenticated, logout } = useAuth();
  const { nexus, addXP } = useNexus();

  // ── PULSO state ──
  const [pulsoOpen, setPulsoOpen] = useState(false);
  const [pulso, setPulso] = useState<PulsoState>(() => {
    const saved = loadPulsoState();
    return saved ?? { status: "idle", duration: 25, remaining: 25 * 60, taskName: "", streakCount: 0 };
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveSessionMut = trpc.cortex.nexus.saveSession.useMutation();

  // Persist to sessionStorage on every change
  useEffect(() => { savePulsoState(pulso); }, [pulso]);

  // Timer tick
  useEffect(() => {
    if (pulso.status === "running") {
      intervalRef.current = setInterval(() => {
        setPulso(prev => {
          if (prev.remaining <= 1) {
            clearInterval(intervalRef.current!);
            // Session complete
            const xp = prev.duration === 25 ? 15 : 35;
            const glifos = prev.duration === 25 ? 10 : 25;
            addXP("pulso_complete", false);
            saveSessionMut.mutate({
              startedAt: new Date(Date.now() - prev.duration * 60 * 1000),
              completedAt: new Date(),
              durationMin: prev.duration,
              status: "completed",
              taskName: prev.taskName || undefined,
              xpEarned: xp,
              glifosEarned: glifos,
              wasFocused: true,
            });
            toast.success(`Sessão concluída! +${xp} XP · ⬡ ${glifos}`, { duration: 4000 });
            return { ...prev, status: "done", remaining: 0, streakCount: prev.streakCount + 1 };
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pulso.status]);

  function pulsoStart() {
    setPulso(p => ({ ...p, status: "running", remaining: p.duration * 60 }));
  }
  function pulsoTogglePause() {
    setPulso(p => ({ ...p, status: p.status === "running" ? "paused" : "running" }));
  }
  function pulsoReset() {
    setPulso(p => ({ ...p, status: "idle", remaining: p.duration * 60 }));
  }
  function pulsoSetDuration(min: number) {
    setPulso(p => ({ ...p, duration: min, remaining: min * 60, status: "idle" }));
  }

  // ── ROTA state ──
  const [rotaOpen, setRotaOpen] = useState(false);
  const [rotaTab, setRotaTab] = useState<"pending" | "history">("pending");
  const [rotaHistoryFilter, setRotaHistoryFilter] = useState<"all" | "week" | "month">("all");
  const [rotaNewOpen, setRotaNewOpen] = useState(false);
  const [rotaTitle, setRotaTitle] = useState("");
  const [rotaDiff, setRotaDiff] = useState<"facil" | "media" | "dificil" | "lendaria">("facil");
  const [rotaDeadline, setRotaDeadline] = useState(todayStr());
  const [rotaPos, setRotaPos] = useState({ x: 0, y: 0 });
  const rotaDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const rotaRef = useRef<HTMLDivElement>(null);

  const { data: rotaTasks = [], refetch: refetchTasks } = trpc.cortex.rota.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: rotaHistory = [], refetch: refetchHistory } = trpc.cortex.rota.history.useQuery(
    { filter: rotaHistoryFilter },
    { enabled: isAuthenticated && rotaTab === "history" }
  );
  const createTaskMut = trpc.cortex.rota.create.useMutation({
    onSuccess: () => { refetchTasks(); setRotaNewOpen(false); setRotaTitle(""); setRotaDeadline(todayStr()); },
  });
  const completeTaskMut = trpc.cortex.rota.complete.useMutation({
    onSuccess: (data) => {
      refetchTasks();
      if (data.bonusEligible) {
        addXP("rota_complete", false);
        toast.success(`Task concluída! +${data.xpEarned} XP · ⬡ ${data.glifosEarned}`, { duration: 3000 });
      } else {
        toast(`Task concluída. ⬡ ${data.glifosEarned} (sem bônus — fora do prazo)`, { duration: 3000 });
      }
    },
  });
  const changeDeadlineMut = trpc.cortex.rota.changeDeadline.useMutation({
    onSuccess: () => { refetchTasks(); toast("Prazo alterado. Bônus cancelado.", { duration: 3000 }); },
  });
  const deleteTaskMut = trpc.cortex.rota.delete.useMutation({
    onSuccess: () => refetchTasks(),
  });

  // Drag for ROTA popup
  function rotaStartDrag(e: React.MouseEvent) {
    const rect = rotaRef.current?.getBoundingClientRect();
    if (!rect) return;
    rotaDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rotaPos.x, origY: rotaPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!rotaDragRef.current) return;
      setRotaPos({
        x: rotaDragRef.current.origX + (ev.clientX - rotaDragRef.current.startX),
        y: rotaDragRef.current.origY + (ev.clientY - rotaDragRef.current.startY),
      });
    };
    const onUp = () => {
      rotaDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function rotaEditDeadline(taskId: number, current: string) {
    const confirmed = window.prompt(
      "Atenção: alterar o prazo cancela o bônus de XP e glifos.\n\nNovo prazo (AAAA-MM-DD):",
      current
    );
    if (!confirmed || confirmed === current) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(confirmed)) { toast.error("Formato inválido. Use AAAA-MM-DD"); return; }
    changeDeadlineMut.mutate({ taskId, newDeadline: confirmed });
  }

  const pendingCount = rotaTasks.length;
  const pulsoActive = pulso.status === "running" || pulso.status === "paused";

  // ── Rank color ──
  const rankColors = ["#fff", "#a8e6cf", "#88d8b0", "#ffd3b6", "#ffaaa5", "#ff8b94", "#c9b1ff"];
  const rankColor = rankColors[(nexus.rankId ?? 1) - 1] ?? "#fff";

  return (
    <>
      {/* ── Header bar ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        height: 56, display: "flex", alignItems: "center",
        padding: "0 24px", gap: 12,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #222",
      }}>
        {/* Left: wordmark */}
        <button
          onClick={() => navigateTo("/")}
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, color: "#fff", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          CÓRTEX
        </button>

        {/* Nav pills */}
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          {[
            { key: "arquivo", label: "ARQUIVO", path: "/arquivo" },
            { key: "nexus",   label: "NEXUS",   path: "/nexus" },
            { key: "dashboard", label: "DASH", path: "/dashboard" },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => navigateTo(item.path)}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                padding: "4px 10px", border: "1px solid",
                borderColor: currentPage === item.key ? "#fff" : "#333",
                color: currentPage === item.key ? "#000" : "#666",
                background: currentPage === item.key ? "#fff" : "transparent",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Right: PULSO + ROTA + NEXUS badge + auth */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {/* PULSO button */}
          <button
            onClick={() => setPulsoOpen(o => !o)}
            style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
              padding: "5px 12px", border: "1px solid",
              borderColor: pulsoActive ? "#fff" : "#333",
              color: pulsoActive ? "#000" : "#666",
              background: pulsoActive ? "#fff" : "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {pulsoActive ? "●" : "○"} PULSO
            {pulsoActive && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9 }}>{fmt(pulso.remaining)}</span>}
          </button>

          {/* ROTA button */}
          {isAuthenticated && (
            <button
              onClick={() => setRotaOpen(o => !o)}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                padding: "5px 12px", border: "1px solid",
                borderColor: pendingCount > 0 ? "#fff" : "#333",
                color: "#666", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6, position: "relative",
              }}
            >
              ◈ ROTA
              {pendingCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "#fff", color: "#000",
                  fontFamily: "'DM Mono', monospace", fontSize: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{pendingCount}</span>
              )}
            </button>
          )}

          {/* NEXUS badge */}
          {isAuthenticated && (
            <button
              onClick={() => navigateTo("/nexus")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", border: "1px solid #222",
                background: "transparent", cursor: "pointer",
              }}
            >
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: rankColor, display: "block" }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#666", letterSpacing: 1 }}>
                {nexus.xp ?? 0} XP
              </span>
            </button>
          )}

          {/* Auth */}
          {isAuthenticated ? (
            <>
              {user?.role === "admin" && (
                <button onClick={() => navigateTo("/admin")} style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, padding: "4px 8px", border: "1px solid #333", color: "#555", background: "transparent", cursor: "pointer" }}>
                  ADMIN
                </button>
              )}
              <button onClick={logout} style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, padding: "4px 8px", border: "1px solid #333", color: "#555", background: "transparent", cursor: "pointer" }}>
                SAIR
              </button>
            </>
          ) : (
            <a href={getLoginUrl()} style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, padding: "4px 10px", border: "1px solid #444", color: "#888", textDecoration: "none" }}>
              ENTRAR
            </a>
          )}
        </div>
      </header>

      {/* ── PULSO popup (fixed below header, right-aligned) ── */}
      {pulsoOpen && (
        <div style={{
          position: "fixed", top: 64, right: 24, zIndex: 999,
          width: 280, background: "#0a0a0a", border: "1px solid #222",
          padding: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 3, color: "#fff" }}>PULSO</span>
            <button onClick={() => setPulsoOpen(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>

          {/* Duration selector */}
          {pulso.status === "idle" && (
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {[25, 50].map(d => (
                <button key={d} onClick={() => pulsoSetDuration(d)} style={{
                  flex: 1, padding: "6px 0", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1,
                  border: "1px solid", borderColor: pulso.duration === d ? "#fff" : "#333",
                  color: pulso.duration === d ? "#000" : "#555",
                  background: pulso.duration === d ? "#fff" : "transparent", cursor: "pointer",
                }}>{d} MIN</button>
              ))}
            </div>
          )}

          {/* Task name */}
          {pulso.status === "idle" && (
            <input
              value={pulso.taskName}
              onChange={e => setPulso(p => ({ ...p, taskName: e.target.value }))}
              placeholder="Nome da sessão (opcional)"
              style={{
                width: "100%", background: "transparent", border: "1px solid #222",
                color: "#888", fontFamily: "'DM Mono', monospace", fontSize: 9,
                padding: "6px 8px", marginBottom: 16, boxSizing: "border-box",
              }}
            />
          )}

          {/* Timer display */}
          <div style={{
            textAlign: "center", fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48, letterSpacing: 4, color: pulsoActive ? "#fff" : "#333",
            marginBottom: 16, lineHeight: 1,
          }}>
            {fmt(pulso.remaining)}
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, background: "#111", marginBottom: 16 }}>
            <div style={{
              height: "100%", background: "#fff",
              width: `${((pulso.duration * 60 - pulso.remaining) / (pulso.duration * 60)) * 100}%`,
              transition: "width 1s linear",
            }} />
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 4 }}>
            {pulso.status === "idle" && (
              <button onClick={pulsoStart} style={{
                flex: 1, padding: "8px 0", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
                border: "1px solid #fff", color: "#000", background: "#fff", cursor: "pointer",
              }}>INICIAR</button>
            )}
            {(pulso.status === "running" || pulso.status === "paused") && (
              <>
                <button onClick={pulsoTogglePause} style={{
                  flex: 1, padding: "8px 0", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
                  border: "1px solid #fff", color: "#000", background: "#fff", cursor: "pointer",
                }}>{pulso.status === "running" ? "PAUSAR" : "RETOMAR"}</button>
                <button onClick={pulsoReset} style={{
                  padding: "8px 12px", fontFamily: "'DM Mono', monospace", fontSize: 10,
                  border: "1px solid #333", color: "#555", background: "transparent", cursor: "pointer",
                }}>↺</button>
              </>
            )}
            {pulso.status === "done" && (
              <button onClick={pulsoReset} style={{
                flex: 1, padding: "8px 0", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
                border: "1px solid #333", color: "#555", background: "transparent", cursor: "pointer",
              }}>NOVA SESSÃO</button>
            )}
          </div>

          {pulso.streakCount > 0 && (
            <div style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#555", textAlign: "center", letterSpacing: 1 }}>
              STREAK: {pulso.streakCount} sessão{pulso.streakCount > 1 ? "ões" : ""}
            </div>
          )}
        </div>
      )}

      {/* ── ROTA — painel lateral ── */}
      {rotaOpen && isAuthenticated && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setRotaOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 997,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(2px)",
              animation: "rotaPanelFadeIn 0.25s ease both",
            }}
          />
          {/* Painel */}
          <div
            style={{
              position: "fixed", top: 56, right: 0, bottom: 0, zIndex: 998,
              width: 380, maxWidth: "100vw",
              background: "#080808",
              borderLeft: "1px solid #1e1e1e",
              display: "flex", flexDirection: "column",
              animation: "rotaPanelSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {/* ── Header do painel ── */}
            <div style={{
              padding: "20px 24px 0",
              borderBottom: "1px solid #1a1a1a",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 28,
                    letterSpacing: 6, color: "#fff", lineHeight: 1,
                  }}>
                    ROTA
                  </div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 9,
                    letterSpacing: 2, color: "#444", marginTop: 4,
                  }}>
                    {pendingCount === 0
                      ? "NENHUMA TASK PENDENTE"
                      : `${pendingCount} TASK${pendingCount > 1 ? "S" : ""} PENDENTE${pendingCount > 1 ? "S" : ""}`}
                  </div>
                </div>
                <button
                  onClick={() => setRotaOpen(false)}
                  style={{
                    background: "none", border: "1px solid #222",
                    color: "#555", cursor: "pointer",
                    width: 32, height: 32, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0,
                  }}
                >✕</button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0 }}>
                {(["pending", "history"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setRotaTab(tab)}
                    style={{
                      flex: 1, padding: "10px 0",
                      fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3,
                      border: "none",
                      borderBottom: rotaTab === tab ? "2px solid #fff" : "2px solid transparent",
                      color: rotaTab === tab ? "#fff" : "#444",
                      background: "transparent", cursor: "pointer",
                      transition: "color 0.2s, border-color 0.2s",
                    }}
                  >
                    {tab === "pending" ? "PENDENTES" : "HISTÓRICO"}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Conteúdo scrollável ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>

              {/* ── Tab: PENDENTES ── */}
              {rotaTab === "pending" && (
                <div>
                  {/* Formulário nova task */}
                  {rotaNewOpen ? (
                    <div style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid #1a1a1a",
                      background: "#0d0d0d",
                    }}>
                      <div style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 8,
                        letterSpacing: 3, color: "#444", marginBottom: 12,
                      }}>
                        NOVA TASK
                      </div>
                      <input
                        value={rotaTitle}
                        onChange={e => setRotaTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && rotaTitle.trim()) {
                            createTaskMut.mutate({ title: rotaTitle.trim(), difficulty: rotaDiff, deadline: rotaDeadline });
                          }
                          if (e.key === "Escape") setRotaNewOpen(false);
                        }}
                        placeholder="Nome da task..."
                        autoFocus
                        style={{
                          width: "100%", background: "transparent",
                          border: "none", borderBottom: "1px solid #2a2a2a",
                          color: "#fff", fontFamily: "'DM Sans', sans-serif",
                          fontSize: 14, padding: "8px 0", marginBottom: 16,
                          boxSizing: "border-box", outline: "none",
                        }}
                      />

                      {/* Dificuldade */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 8,
                          letterSpacing: 2, color: "#333", marginBottom: 8,
                        }}>
                          DIFICULDADE
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                          {([
                            { id: "facil",    label: "FÁCIL",    color: "#3a8a3a" },
                            { id: "media",    label: "MÉDIA",    color: "#8a6a2a" },
                            { id: "dificil",  label: "DIFÍCIL",  color: "#8a3a3a" },
                            { id: "lendaria", label: "LENDÁRIA", color: "#6a3a8a" },
                          ] as const).map(d => (
                            <button
                              key={d.id}
                              onClick={() => setRotaDiff(d.id)}
                              style={{
                                padding: "8px 0",
                                fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: 1,
                                border: `1px solid ${rotaDiff === d.id ? d.color : "#1e1e1e"}`,
                                color: rotaDiff === d.id ? "#fff" : "#444",
                                background: rotaDiff === d.id ? `${d.color}22` : "transparent",
                                cursor: "pointer", transition: "all 0.15s",
                              }}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Prazo */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 8,
                          letterSpacing: 2, color: "#333", marginBottom: 8,
                        }}>
                          PRAZO
                        </div>
                        <input
                          type="date"
                          value={rotaDeadline}
                          onChange={e => setRotaDeadline(e.target.value)}
                          style={{
                            width: "100%", background: "transparent",
                            border: "1px solid #1e1e1e",
                            color: "#888", fontFamily: "'DM Mono', monospace",
                            fontSize: 11, padding: "8px 10px",
                            colorScheme: "dark", boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {/* Recompensa preview */}
                      <div style={{
                        padding: "10px 12px", background: "#111",
                        border: "1px solid #1a1a1a", marginBottom: 16,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#444", letterSpacing: 1 }}>
                          RECOMPENSA SE NO PRAZO
                        </span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#888", letterSpacing: 1 }}>
                          +{ROTA_REWARDS[rotaDiff].xp} XP · ⬡ {ROTA_REWARDS[rotaDiff].glifos}
                        </span>
                      </div>

                      {/* Botões */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            if (!rotaTitle.trim()) return;
                            createTaskMut.mutate({ title: rotaTitle.trim(), difficulty: rotaDiff, deadline: rotaDeadline });
                          }}
                          disabled={createTaskMut.isPending || !rotaTitle.trim()}
                          style={{
                            flex: 1, padding: "12px 0",
                            fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                            border: "none", color: "#000", background: "#fff",
                            cursor: createTaskMut.isPending || !rotaTitle.trim() ? "default" : "pointer",
                            opacity: !rotaTitle.trim() ? 0.4 : 1,
                            transition: "opacity 0.2s",
                          }}
                        >
                          {createTaskMut.isPending ? "CRIANDO..." : "CRIAR TASK"}
                        </button>
                        <button
                          onClick={() => { setRotaNewOpen(false); setRotaTitle(""); }}
                          style={{
                            padding: "12px 16px",
                            fontFamily: "'DM Mono', monospace", fontSize: 9,
                            border: "1px solid #222", color: "#444",
                            background: "transparent", cursor: "pointer",
                          }}
                        >
                          CANCELAR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRotaNewOpen(true)}
                      style={{
                        width: "100%", padding: "16px 24px", textAlign: "left",
                        fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3,
                        color: "#555", background: "transparent",
                        border: "none", borderBottom: "1px solid #111",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#555")}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                      NOVA TASK
                    </button>
                  )}

                  {/* Lista de tasks pendentes */}
                  {rotaTasks.length === 0 ? (
                    <div style={{
                      padding: "48px 24px", textAlign: "center",
                    }}>
                      <div style={{
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: 48,
                        letterSpacing: 4, color: "#1a1a1a", marginBottom: 12,
                      }}>
                        ◈
                      </div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 9,
                        letterSpacing: 2, color: "#333",
                      }}>
                        NENHUMA TASK PENDENTE
                      </div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 8,
                        letterSpacing: 1, color: "#222", marginTop: 8,
                      }}>
                        Crie uma task para começar
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "8px 0" }}>
                      {rotaTasks.map(task => {
                        const deadline = task.currentDeadline ? new Date(task.currentDeadline as unknown as string) : null;
                        const overdue = deadline ? new Date() > new Date(deadline.getTime() + 24 * 60 * 60 * 1000) : false;
                        const deadlineStr = deadline ? deadline.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
                        const reward = ROTA_REWARDS[task.difficulty];
                        const diffColors: Record<string, string> = {
                          facil: "#3a8a3a", media: "#8a6a2a", dificil: "#8a3a3a", lendaria: "#6a3a8a",
                        };
                        const diffColor = diffColors[task.difficulty] ?? "#444";
                        return (
                          <div
                            key={task.id}
                            style={{
                              padding: "16px 24px",
                              borderBottom: "1px solid #111",
                              background: overdue ? "rgba(255,80,80,0.02)" : "transparent",
                              borderLeft: `2px solid ${overdue ? "#ff5050" : diffColor}`,
                              transition: "background 0.2s",
                            }}
                          >
                            {/* Linha superior: check + título + ações */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              {/* Botão completar */}
                              <button
                                onClick={() => completeTaskMut.mutate({ taskId: task.id })}
                                title="Completar task"
                                style={{
                                  width: 18, height: 18, borderRadius: "50%",
                                  border: `1px solid ${overdue ? "#ff5050" : "#333"}`,
                                  background: "transparent", cursor: "pointer",
                                  flexShrink: 0, marginTop: 2,
                                  transition: "border-color 0.2s, background 0.2s",
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLButtonElement).style.background = overdue ? "#ff505022" : "#ffffff22";
                                  (e.currentTarget as HTMLButtonElement).style.borderColor = overdue ? "#ff5050" : "#fff";
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                  (e.currentTarget as HTMLButtonElement).style.borderColor = overdue ? "#ff5050" : "#333";
                                }}
                              />
                              {/* Título */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                                  color: overdue ? "#ff8080" : "#ccc",
                                  lineHeight: 1.3, marginBottom: 6,
                                }}>
                                  {task.title}
                                </div>
                                {/* Meta info */}
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={{
                                    fontFamily: "'DM Mono', monospace", fontSize: 8,
                                    letterSpacing: 1, color: diffColor,
                                    padding: "2px 6px", border: `1px solid ${diffColor}44`,
                                  }}>
                                    {task.difficulty.toUpperCase()}
                                  </span>
                                  <span style={{
                                    fontFamily: "'DM Mono', monospace", fontSize: 8,
                                    letterSpacing: 1, color: overdue ? "#ff5050" : "#444",
                                  }}>
                                    {overdue ? "⚠ " : "◷ "}{deadlineStr}
                                  </span>
                                  {!task.deadlineChanged && reward && (
                                    <span style={{
                                      fontFamily: "'DM Mono', monospace", fontSize: 8,
                                      letterSpacing: 1, color: "#333",
                                    }}>
                                      +{reward.xp} XP · ⬡{reward.glifos}
                                    </span>
                                  )}
                                  {task.deadlineChanged && (
                                    <span style={{
                                      fontFamily: "'DM Mono', monospace", fontSize: 8,
                                      letterSpacing: 1, color: "#ff5050",
                                    }}>
                                      SEM BÔNUS
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Ações */}
                              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                <button
                                  onClick={() => rotaEditDeadline(task.id, (task.currentDeadline as string | null)?.slice(0, 10) ?? todayStr())}
                                  title="Alterar prazo"
                                  style={{
                                    background: "none", border: "none",
                                    color: "#333", cursor: "pointer",
                                    width: 28, height: 28, display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    fontSize: 12, transition: "color 0.2s",
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "#888")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                                >✎</button>
                                <button
                                  onClick={() => deleteTaskMut.mutate({ taskId: task.id })}
                                  title="Remover task"
                                  style={{
                                    background: "none", border: "none",
                                    color: "#333", cursor: "pointer",
                                    width: 28, height: 28, display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    fontSize: 12, transition: "color 0.2s",
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "#ff5050")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                                >✕</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: HISTÓRICO ── */}
              {rotaTab === "history" && (
                <div>
                  {/* Filtros */}
                  <div style={{
                    display: "flex", gap: 0,
                    padding: "12px 24px", borderBottom: "1px solid #111",
                  }}>
                    {(["all", "week", "month"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => { setRotaHistoryFilter(f); refetchHistory(); }}
                        style={{
                          flex: 1, padding: "8px 0",
                          fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2,
                          border: "1px solid",
                          borderColor: rotaHistoryFilter === f ? "#fff" : "#1e1e1e",
                          color: rotaHistoryFilter === f ? "#000" : "#444",
                          background: rotaHistoryFilter === f ? "#fff" : "transparent",
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {f === "all" ? "TUDO" : f === "week" ? "SEMANA" : "MÊS"}
                      </button>
                    ))}
                  </div>

                  {rotaHistory.length === 0 ? (
                    <div style={{ padding: "48px 24px", textAlign: "center" }}>
                      <div style={{
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: 48,
                        letterSpacing: 4, color: "#1a1a1a", marginBottom: 12,
                      }}>
                        ○
                      </div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 9,
                        letterSpacing: 2, color: "#333",
                      }}>
                        NENHUMA TASK CONCLUÍDA
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "8px 0" }}>
                      {rotaHistory.map(task => {
                        const hasBonus = (task.xpEarned ?? 0) > 0;
                        const date = task.completedAt
                          ? new Date(task.completedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                          : "—";
                        return (
                          <div
                            key={task.id}
                            style={{
                              padding: "14px 24px",
                              borderBottom: "1px solid #0e0e0e",
                              display: "flex", alignItems: "center", gap: 12,
                            }}
                          >
                            <span style={{ color: "#2a2a2a", fontSize: 12, flexShrink: 0 }}>●</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                                color: "#555", overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {task.title}
                              </div>
                              <div style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 8,
                                color: "#2a2a2a", letterSpacing: 1, marginTop: 3,
                              }}>
                                {date}
                              </div>
                            </div>
                            <div style={{
                              fontFamily: "'DM Mono', monospace", fontSize: 8,
                              letterSpacing: 1, whiteSpace: "nowrap",
                              color: hasBonus ? "#666" : "#2a2a2a",
                            }}>
                              {hasBonus ? `+${task.xpEarned} XP · ⬡${task.glifosEarned}` : "⬡ 2"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
