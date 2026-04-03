import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PageTransitionContextValue {
  navigateTo: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  navigateTo: () => {},
});

export function usePageTransition() {
  return useContext(PageTransitionContext);
}

// ─── Overlay Component ────────────────────────────────────────────────────────
// A full-screen black panel that slides in from bottom, holds, then slides out
function TransitionOverlay({ phase }: { phase: "idle" | "in" | "hold" | "out" }) {
  const visible = phase !== "idle";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        pointerEvents: phase === "idle" ? "none" : "all",
        background: "#000",
        // Slide in from bottom (phase "in"), stay (phase "hold"), slide out to top (phase "out")
        transform:
          phase === "idle"
            ? "translateY(100%)"
            : phase === "in"
            ? "translateY(0%)"
            : phase === "hold"
            ? "translateY(0%)"
            : "translateY(-100%)",
        transition:
          phase === "in"
            ? "transform 0.55s cubic-bezier(0.76, 0, 0.24, 1)"
            : phase === "out"
            ? "transform 0.55s cubic-bezier(0.76, 0, 0.24, 1)"
            : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Decorative elements visible during transition */}
      {visible && (
        <>
          {/* Horizontal scan line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(255,255,255,0.12)",
              animation: "scanH 0.9s ease forwards",
            }}
          />
          {/* CÓRTEX wordmark */}
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(32px, 6vw, 64px)",
              letterSpacing: 12,
              color: "rgba(255,255,255,0.06)",
              userSelect: "none",
              animation: "fadeIn 0.3s ease 0.1s both",
            }}
          >
            CÓRTEX
          </span>
          {/* Corner marks */}
          {[
            { top: 24, left: 24 },
            { top: 24, right: 24 },
            { bottom: 24, left: 24 },
            { bottom: 24, right: 24 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 16,
                height: 16,
                borderTop: i < 2 ? "1px solid rgba(255,255,255,0.15)" : "none",
                borderBottom: i >= 2 ? "1px solid rgba(255,255,255,0.15)" : "none",
                borderLeft: i % 2 === 0 ? "1px solid rgba(255,255,255,0.15)" : "none",
                borderRight: i % 2 === 1 ? "1px solid rgba(255,255,255,0.15)" : "none",
                ...pos,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<"idle" | "in" | "hold" | "out">("out");
  // Start with "out" so the first page entry also gets the slide-out reveal
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: trigger the initial page-in reveal
  // (overlay starts at translateY(-100%) via "out", then goes to "idle")
  useEffect(() => {
    const t = setTimeout(() => setPhase("idle"), 600);
    return () => clearTimeout(t);
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      // 1. Slide overlay in from bottom
      setPhase("in");

      // 2. After overlay covers screen, navigate
      timerRef.current = setTimeout(() => {
        setPhase("hold");
        setLocation(href);

        // 3. After a brief hold, slide overlay out to top
        timerRef.current = setTimeout(() => {
          setPhase("out");

          // 4. Reset to idle after exit animation
          timerRef.current = setTimeout(() => {
            setPhase("idle");
          }, 600);
        }, 120);
      }, 580);
    },
    [setLocation]
  );

  return (
    <PageTransitionContext.Provider value={{ navigateTo }}>
      <TransitionOverlay phase={phase} />
      {children}
    </PageTransitionContext.Provider>
  );
}
