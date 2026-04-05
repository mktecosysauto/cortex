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

      {/* ── ROTA popup (draggable) ── */}
      {rotaOpen && isAuthenticated && (
        <div
          ref={rotaRef}
          style={{
            position: "fixed", top: 64 + rotaPos.y, right: 24 - rotaPos.x, zIndex: 998,
            width: 320, background: "#0a0a0a", border: "1px solid #222",
          }}
        >
          {/* Header */}
          <div
            onMouseDown={rotaStartDrag}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderBottom: "1px solid #1a1a1a", cursor: "grab",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 3, color: "#fff" }}>ROTA</span>
              {pendingCount > 0 && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#555", letterSpacing: 1 }}>
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333", letterSpacing: 1 }}>⠿ arrastar</span>
              <button onClick={() => setRotaOpen(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a" }}>
            {(["pending", "history"] as const).map(tab => (
              <button key={tab} onClick={() => setRotaTab(tab)} style={{
                flex: 1, padding: "8px 0", fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2,
                border: "none", borderBottom: rotaTab === tab ? "1px solid #fff" : "1px solid transparent",
                color: rotaTab === tab ? "#fff" : "#444", background: "transparent", cursor: "pointer",
              }}>
                {tab === "pending" ? "PENDENTES" : "HISTÓRICO"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px 0" }}>
            {rotaTab === "pending" && (
              <>
                {/* New task form */}
                {rotaNewOpen ? (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
                    <input
                      value={rotaTitle}
                      onChange={e => setRotaTitle(e.target.value)}
                      placeholder="Nome da task..."
                      autoFocus
                      style={{
                        width: "100%", background: "transparent", border: "1px solid #222",
                        color: "#ccc", fontFamily: "'DM Mono', monospace", fontSize: 9,
                        padding: "6px 8px", marginBottom: 8, boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                      {(["facil", "media", "dificil", "lendaria"] as const).map(d => (
                        <button key={d} onClick={() => setRotaDiff(d)} style={{
                          flex: 1, padding: "4px 0", fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: 1,
                          border: "1px solid", borderColor: rotaDiff === d ? "#fff" : "#222",
                          color: rotaDiff === d ? "#000" : "#444",
                          background: rotaDiff === d ? "#fff" : "transparent", cursor: "pointer",
                        }}>{d.toUpperCase().slice(0, 4)}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#444", letterSpacing: 1, whiteSpace: "nowrap" }}>PRAZO</span>
                      <input
                        type="date"
                        value={rotaDeadline}
                        onChange={e => setRotaDeadline(e.target.value)}
                        style={{
                          flex: 1, background: "transparent", border: "1px solid #222",
                          color: "#888", fontFamily: "'DM Mono', monospace", fontSize: 9,
                          padding: "4px 6px", colorScheme: "dark",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => {
                          if (!rotaTitle.trim()) return;
                          createTaskMut.mutate({ title: rotaTitle.trim(), difficulty: rotaDiff, deadline: rotaDeadline });
                        }}
                        disabled={createTaskMut.isPending}
                        style={{
                          flex: 1, padding: "6px 0", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1,
                          border: "1px solid #fff", color: "#000", background: "#fff", cursor: "pointer",
                        }}
                      >
                        {createTaskMut.isPending ? "..." : "CRIAR"}
                      </button>
                      <button onClick={() => setRotaNewOpen(false)} style={{
                        padding: "6px 12px", fontFamily: "'DM Mono', monospace", fontSize: 9,
                        border: "1px solid #222", color: "#444", background: "transparent", cursor: "pointer",
                      }}>✕</button>
                    </div>
                    {/* Reward preview */}
                    <div style={{ marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#333", letterSpacing: 1 }}>
                      RECOMPENSA: +{ROTA_REWARDS[rotaDiff].xp} XP · ⬡ {ROTA_REWARDS[rotaDiff].glifos} (se no prazo)
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setRotaNewOpen(true)}
                    style={{
                      width: "100%", padding: "10px 16px", textAlign: "left",
                      fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#444",
                      background: "transparent", border: "none", borderBottom: "1px solid #1a1a1a", cursor: "pointer",
                    }}
                  >
                    + NOVA TASK
                  </button>
                )}

                {/* Pending list */}
                {rotaTasks.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333", letterSpacing: 1 }}>
                    NENHUMA TASK PENDENTE
                  </div>
                ) : rotaTasks.map(task => {
                  const deadline = task.currentDeadline ? new Date(task.currentDeadline as unknown as string) : null;
                  const overdue = deadline ? new Date() > new Date(deadline.getTime() + 24 * 60 * 60 * 1000) : false;
                  const deadlineStr = deadline ? deadline.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
                  const reward = ROTA_REWARDS[task.difficulty];

                  return (
                    <div key={task.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 16px", borderBottom: "1px solid #111",
                      background: overdue ? "rgba(255,80,80,0.03)" : "transparent",
                    }}>
                      {/* Check */}
                      <button
                        onClick={() => completeTaskMut.mutate({ taskId: task.id })}
                        style={{
                          width: 14, height: 14, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                          border: "1px solid", borderColor: overdue ? "#ff5050" : "#333",
                          background: "transparent", cursor: "pointer",
                        }}
                      />
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: overdue ? "#ff8080" : "#ccc", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.title}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: overdue ? "#ff5050" : "#444", letterSpacing: 1 }}>
                            {overdue ? "⚠ " : ""}{deadlineStr}
                          </span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#333", letterSpacing: 1 }}>
                            {task.difficulty.toUpperCase()}
                          </span>
                          {!task.deadlineChanged && reward && (
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#2a2a2a", letterSpacing: 1 }}>
                              +{reward.xp}xp ⬡{reward.glifos}
                            </span>
                          )}
                          {task.deadlineChanged && (
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#ff5050", letterSpacing: 1 }}>sem bônus</span>
                          )}
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => rotaEditDeadline(task.id, (task.currentDeadline as string | null)?.slice(0, 10) ?? todayStr())}
                          style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 10, padding: "2px 4px" }}
                          title="Alterar prazo"
                        >✎</button>
                        <button
                          onClick={() => deleteTaskMut.mutate({ taskId: task.id })}
                          style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 10, padding: "2px 4px" }}
                          title="Remover"
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {rotaTab === "history" && (
              <>
                {/* Filters */}
                <div style={{ display: "flex", gap: 4, padding: "8px 16px", borderBottom: "1px solid #1a1a1a" }}>
                  {(["all", "week", "month"] as const).map(f => (
                    <button key={f} onClick={() => { setRotaHistoryFilter(f); refetchHistory(); }} style={{
                      flex: 1, padding: "4px 0", fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: 1,
                      border: "1px solid", borderColor: rotaHistoryFilter === f ? "#fff" : "#222",
                      color: rotaHistoryFilter === f ? "#000" : "#444",
                      background: rotaHistoryFilter === f ? "#fff" : "transparent", cursor: "pointer",
                    }}>
                      {f === "all" ? "TUDO" : f === "week" ? "SEMANA" : "MÊS"}
                    </button>
                  ))}
                </div>
                {rotaHistory.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333", letterSpacing: 1 }}>
                    NENHUMA TASK CONCLUÍDA
                  </div>
                ) : rotaHistory.map(task => {
                  const hasBonus = (task.xpEarned ?? 0) > 0;
                  const date = task.completedAt ? new Date(task.completedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
                  return (
                    <div key={task.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 16px", borderBottom: "1px solid #111",
                    }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#666", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#333", letterSpacing: 1, whiteSpace: "nowrap" }}>{date}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: 1, whiteSpace: "nowrap", color: hasBonus ? "#888" : "#333" }}>
                        {hasBonus ? `+${task.xpEarned} XP · ⬡${task.glifosEarned}` : "⬡ 2"}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
