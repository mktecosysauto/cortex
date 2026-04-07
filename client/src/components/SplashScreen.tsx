/**
 * SplashScreen — Tela de carregamento do CÓRTEX
 *
 * Aparece apenas uma vez por dia (sessionStorage: cortex_splash_shown_<date>).
 * Exibe o SAPO base animado, o nome CÓRTEX em Bebas Neue e uma barra de progresso.
 * Duração total: ~2.2s antes de desaparecer com fade out.
 */

import { useEffect, useState } from "react";
import SapoAgent from "./SapoAgent";

const SPLASH_KEY = `cortex_splash_${new Date().toDateString()}`;

export function useSplashScreen() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem(SPLASH_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (show) {
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [show]);

  function dismiss() {
    setShow(false);
  }

  return { show, dismiss };
}

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Fase 1: barra de progresso sobe de 0 a 100 em ~1.6s
    const start = performance.now();
    const duration = 1600;

    function tick(now: number) {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setPhase("hold");
        // Fase 2: hold 300ms
        setTimeout(() => {
          setPhase("out");
          // Fase 3: fade out 400ms
          setTimeout(() => {
            setVisible(false);
            onDone();
          }, 400);
        }, 300);
      }
    }
    requestAnimationFrame(tick);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.4s ease-in" : "opacity 0.3s ease-out",
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      {/* Grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          pointerEvents: "none",
        }}
      />

      {/* SAPO animado */}
      <div
        style={{
          opacity: phase === "in" ? 1 : 1,
          transform: phase === "in" ? "translateY(0)" : "translateY(-8px)",
          transition: "transform 0.6s ease-out",
          marginBottom: 32,
        }}
      >
        <SapoAgent skin="base" state="idle" size={160} />
      </div>

      {/* Nome CÓRTEX */}
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(48px, 10vw, 80px)",
          letterSpacing: 8,
          color: "#fff",
          lineHeight: 1,
          marginBottom: 8,
          opacity: phase === "in" ? 1 : 1,
        }}
      >
        CÓRTEX
      </div>

      {/* Subtítulo */}
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: 4,
          color: "#aaa",
          textTransform: "uppercase",
          marginBottom: 40,
        }}
      >
        Sistema Central de Design
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          width: "min(280px, 60vw)",
          height: 1,
          background: "#1a1a1a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${progress}%`,
            background: "#fff",
            transition: "width 0.05s linear",
          }}
        />
      </div>

      {/* Percentual */}
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: 2,
          color: "#777",
          marginTop: 10,
        }}
      >
        {Math.round(progress).toString().padStart(3, "0")}
      </div>
    </div>
  );
}
