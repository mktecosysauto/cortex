import { useState, useEffect, useRef, useCallback } from "react";
import { useNexus, renderAgentSVG, calcReward } from "@/contexts/NexusContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

type PulsoStatus = "idle" | "active" | "paused" | "done";

interface PulsoState {
  status: PulsoStatus;
  duration: number;
  remaining: number;
  total: number;
  taskName: string;
  streakCount: number;
}

// Global pulso state ref accessible from outside
let _pulsoStatusRef: PulsoStatus = "idle";
export function isPulsoActive(): boolean {
  return _pulsoStatusRef === "active";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PulsoWidget() {
  const { nexus, addXP, updateNexus, getCurrentRankData } = useNexus();
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<PulsoState>({
    status: "idle",
    duration: 25,
    remaining: 25 * 60,
    total: 25 * 60,
    taskName: "",
    streakCount: nexus.stats.currentStreak,
  });
  const [showComplete, setShowComplete] = useState(false);
  const [lastReward, setLastReward] = useState({ xp: 0, glifos: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);

  // Keep global ref in sync
  useEffect(() => { _pulsoStatusRef = state.status; }, [state.status]);

  const rank = getCurrentRankData();
  const agentSvg = renderAgentSVG("mini", rank.color, nexus.agentAppearance.effectId, nexus.agentAppearance.silhouetteId);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setDuration = useCallback((min: number) => {
    if (state.status === "active") return;
    setState((p) => ({ ...p, duration: min, remaining: min * 60, total: min * 60 }));
  }, [state.status]);

  const start = useCallback(() => {
    const taskName = taskInputRef.current?.value || "Sessão de foco";
    setState((p) => ({ ...p, status: "active", taskName }));
    intervalRef.current = setInterval(() => {
      setState((p) => {
        if (p.remaining <= 1) {
          clearTimer();
          return { ...p, remaining: 0, status: "done" };
        }
        return { ...p, remaining: p.remaining - 1 };
      });
    }, 1000);
  }, [clearTimer]);

  const pause = useCallback(() => {
    if (state.status === "active") {
      clearTimer();
      setState((p) => ({ ...p, status: "paused" }));
    } else if (state.status === "paused") {
      intervalRef.current = setInterval(() => {
        setState((p) => {
          if (p.remaining <= 1) {
            clearTimer();
            return { ...p, remaining: 0, status: "done" };
          }
          return { ...p, remaining: p.remaining - 1 };
        });
      }, 1000);
      setState((p) => ({ ...p, status: "active" }));
    }
  }, [state.status, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    updateNexus((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        currentStreak: 0,
        pomodoroAbandoned: prev.stats.pomodoroAbandoned + 1,
      },
    }));
    setState((p) => ({
      ...p,
      status: "idle",
      remaining: p.total,
      streakCount: 0,
    }));
  }, [clearTimer, updateNexus]);

  // Handle completion
  useEffect(() => {
    if (state.status !== "done") return;
    clearTimer();

    const type = state.duration === 25 ? "pomodoro_25min" : "pomodoro_50min";
    const isFocused = document.body.dataset.tool !== undefined;
    const reward = calcReward(type, isFocused);
    setLastReward(reward);

    const newStreak = state.streakCount + 1;

    updateNexus((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        pomodoroCompleted: prev.stats.pomodoroCompleted + 1,
        pomodoroTotalMin: prev.stats.pomodoroTotalMin + state.duration,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.stats.bestStreak, newStreak),
        lastSessionDate: new Date().toISOString(),
      },
    }));

    addXP(type, isFocused);
    if (newStreak % 3 === 0) addXP("pomodoro_streak_3", false);

    setState((p) => ({ ...p, streakCount: newStreak }));
    setShowComplete(true);

    setTimeout(() => {
      setShowComplete(false);
      setState((p) => ({ ...p, status: "idle", remaining: p.total }));
    }, 3500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const pct = ((state.total - state.remaining) / state.total) * 100;
  const expectedReward = calcReward(
    state.duration === 25 ? "pomodoro_25min" : "pomodoro_50min",
    document.body.dataset.tool !== undefined
  );

  const isActive = state.status === "active";
  const isRunning = isActive || state.status === "paused";

  return (
    <>
      {/* ── Widget ── */}
      <div
        id="pulso-widget"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 1000,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {!expanded ? (
          /* Collapsed pill */
          <button
            onClick={() => setExpanded(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--pulso-bg)",
              border: `1px solid ${isActive ? "#fff" : "var(--pulso-border)"}`,
              padding: "8px 14px",
              cursor: "none",
              backdropFilter: "blur(12px)",
              transition: "border-color 0.3s",
            }}
          >
            <div
              style={{ width: 20, height: 20 }}
              dangerouslySetInnerHTML={{ __html: agentSvg }}
            />
            <span
              style={{
                fontSize: 13,
                letterSpacing: 3,
                color: isActive ? "#fff" : "#666",
                animation: isActive ? "pulsoTick 2s ease infinite" : "none",
                fontFamily: "'Bebas Neue', sans-serif",
              }}
            >
              {isRunning ? formatTime(state.remaining) : "PULSO"}
            </span>
            {isActive && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
            )}
          </button>
        ) : (
          /* Expanded panel */
          <div
            style={{
              background: "var(--pulso-bg)",
              border: `1px solid ${isActive ? "#fff" : "var(--pulso-border)"}`,
              padding: 20,
              width: 260,
              backdropFilter: "blur(12px)",
              transition: "border-color 0.3s",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 10, letterSpacing: 4, color: "#fff", textTransform: "uppercase" }}>PULSO</span>
              <button
                onClick={() => { if (!isActive) setExpanded(false); }}
                style={{ background: "none", border: "none", color: "#666", cursor: "none", fontSize: 12, padding: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Agent mini */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  animation: isActive ? "agentCelebrate 2s ease infinite" : "none",
                }}
                dangerouslySetInnerHTML={{ __html: renderAgentSVG("full", rank.color, nexus.agentAppearance.effectId, nexus.agentAppearance.silhouetteId).replace('width="200" height="200"', 'width="48" height="48"') }}
              />
            </div>

            {/* Task input */}
            {!isRunning && (
              <input
                ref={taskInputRef}
                type="text"
                placeholder="Em que você vai focar?"
                style={{
                  width: "100%",
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  color: "#fff",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  padding: "8px 10px",
                  letterSpacing: 1,
                  marginBottom: 12,
                  outline: "none",
                }}
              />
            )}

            {/* Duration selector */}
            {!isRunning && (
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                {[25, 50].map((min) => (
                  <button
                    key={min}
                    onClick={() => setDuration(min)}
                    style={{
                      flex: 1,
                      background: "none",
                      border: `1px solid ${state.duration === min ? "#fff" : "#2a2a2a"}`,
                      color: state.duration === min ? "#fff" : "#666",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      padding: "6px",
                      cursor: "none",
                      letterSpacing: 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            )}

            {/* Timer display */}
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 48,
                letterSpacing: 4,
                color: "#fff",
                textAlign: "center",
                lineHeight: 1,
                marginBottom: 12,
                animation: isActive ? "pulsoTick 2s ease infinite" : "none",
              }}
            >
              {formatTime(state.remaining)}
            </div>

            {/* Progress bar */}
            <div style={{ width: "100%", height: 2, background: "#2a2a2a", marginBottom: 10 }}>
              <div style={{ height: "100%", background: "#fff", width: `${pct}%`, transition: "width 1s linear" }} />
            </div>

            {/* Expected reward */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#666", letterSpacing: 1, marginBottom: 16 }}>
              <span>⬡ +{expectedReward.glifos} glifos</span>
              <span>+{expectedReward.xp} XP</span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {!isRunning ? (
                <button
                  onClick={start}
                  style={{
                    flex: 1,
                    background: "#fff",
                    color: "#000",
                    border: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 500,
                    padding: 10,
                    cursor: "none",
                    letterSpacing: 1,
                  }}
                >
                  Iniciar
                </button>
              ) : (
                <>
                  <button
                    onClick={pause}
                    style={{
                      flex: 1,
                      background: "none",
                      border: "1px solid #2a2a2a",
                      color: "#999",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      padding: 10,
                      cursor: "none",
                      letterSpacing: 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {state.status === "paused" ? "▶ Retomar" : "⏸ Pausar"}
                  </button>
                  <button
                    onClick={stop}
                    style={{
                      flex: 1,
                      background: "none",
                      border: "1px solid #2a2a2a",
                      color: "#666",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      padding: 10,
                      cursor: "none",
                      letterSpacing: 1,
                      transition: "all 0.2s",
                    }}
                  >
                    ✕ Encerrar
                  </button>
                </>
              )}
            </div>

            {/* Streak */}
            <div style={{ fontSize: 9, color: "#444", letterSpacing: 1, textAlign: "center" }}>
              {state.streakCount > 0
                ? `STREAK ${state.streakCount}× ${state.streakCount >= 3 ? "🔥" : ""}`
                : "Sem streak ativo"}
            </div>
          </div>
        )}
      </div>

      {/* ── Completion overlay ── */}
      {showComplete && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 1001,
            background: "var(--pulso-bg)",
            border: "1px solid #fff",
            padding: 24,
            width: 260,
            textAlign: "center",
            animation: "fadeUp 0.3s ease",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{ display: "flex", justifyContent: "center", marginBottom: 12, animation: "agentCelebrate 0.6s ease infinite" }}
            dangerouslySetInnerHTML={{ __html: renderAgentSVG("full", rank.color, nexus.agentAppearance.effectId, nexus.agentAppearance.silhouetteId).replace('width="200" height="200"', 'width="48" height="48"') }}
          />
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 4, color: "#fff", margin: "12px 0 8px" }}>
            SESSÃO CONCLUÍDA
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#999", letterSpacing: 1 }}>
            <span>+{lastReward.xp} XP</span>
            <span>⬡ +{lastReward.glifos}</span>
          </div>
        </div>
      )}
    </>
  );
}
