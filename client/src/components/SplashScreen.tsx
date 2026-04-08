/**
 * SplashScreen — Tela de carregamento cerimonial do CÓRTEX
 *
 * Aparece apenas uma vez por dia (sessionStorage: cortex_splash_<date>).
 * Fases:
 *   1. "in"   — símbolo SVG surge com fade + scale, contador sobe 000→100 em ~1.8s
 *   2. "iris" — a tela preta encolhe via clip-path: circle() do centro para fora
 *               revelando o hero por baixo (efeito "abertura de íris")
 *   3. done   — componente desmontado
 */

import { useEffect, useRef, useState } from "react";

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
  const [phase, setPhase] = useState<"in" | "iris" | "done">("in");
  const [symbolVisible, setSymbolVisible] = useState(false);
  // irisR: 100 = tela cheia (fechada), 0 = íris totalmente aberta
  const [irisR, setIrisR] = useState(100);
  const rafRef = useRef<number>(0);
  const irisRafRef = useRef<number>(0);

  // Fase "in": símbolo surge, contador sobe 0→100
  useEffect(() => {
    const symbolTimer = setTimeout(() => setSymbolVisible(true), 80);

    const start = performance.now();
    const duration = 1800;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic — acelera no início, desacelera no fim
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = eased * 100;
      setProgress(pct);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // hold 200ms antes de abrir a íris
        setTimeout(() => setPhase("iris"), 200);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(symbolTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Fase "iris": clip-path encolhe de 100% → 0%
  useEffect(() => {
    if (phase !== "iris") return;

    const start = performance.now();
    const duration = 750;

    function expand(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeInOutCubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // R vai de 100 (fechado) até 0 (aberto)
      setIrisR(100 - eased * 100);

      if (t < 1) {
        irisRafRef.current = requestAnimationFrame(expand);
      } else {
        setPhase("done");
        onDone();
      }
    }

    irisRafRef.current = requestAnimationFrame(expand);
    return () => cancelAnimationFrame(irisRafRef.current);
  }, [phase, onDone]);

  if (phase === "done") return null;

  return (
    /*
     * Wrapper transparente — apenas bloqueia interações enquanto ativo.
     * A tela preta visível é a div interna com clip-path.
     */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: phase === "iris" ? "none" : "all",
      }}
    >
      {/* ── Tela preta com íris ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          // clip-path: circle(R% at 50% 50%)
          // R=100 → tela cheia; R=0 → círculo zero (invisível)
          clipPath: `circle(${irisR}% at 50% 50%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Grain overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.035,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            pointerEvents: "none",
          }}
        />

        {/* Conteúdo central — some suavemente quando a íris abre */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            opacity: phase === "iris" ? 0 : 1,
            transition: phase === "iris" ? "opacity 0.18s ease-in" : "none",
          }}
        >
          {/* Símbolo SVG pulsante */}
          <div
            style={{
              opacity: symbolVisible ? 1 : 0,
              transform: symbolVisible ? "scale(1)" : "scale(0.8)",
              transition: "opacity 0.6s ease-out, transform 0.9s cubic-bezier(0.16,1,0.3,1)",
              marginBottom: 36,
              animation: symbolVisible ? "cortex-pulse 2.8s ease-in-out infinite" : "none",
            }}
          >
            <svg
              width="76"
              height="76"
              viewBox="0 0 76 76"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Anel externo tracejado — gira lentamente */}
              <circle
                cx="38"
                cy="38"
                r="35"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
                strokeDasharray="3 7"
                style={{ animation: "cortex-spin 14s linear infinite" }}
              />
              {/* Anel médio sólido */}
              <circle
                cx="38"
                cy="38"
                r="27"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.75"
              />
              {/* Anel interno */}
              <circle
                cx="38"
                cy="38"
                r="19"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="0.5"
              />
              {/* Letra C central */}
              <text
                x="38"
                y="38"
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="'Bebas Neue', sans-serif"
                fontSize="30"
                fill="white"
                letterSpacing="1"
              >
                C
              </text>
              {/* 4 marcadores nos eixos cardinais */}
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 38 + Math.cos(rad) * 31;
                const y1 = 38 + Math.sin(rad) * 31;
                const x2 = 38 + Math.cos(rad) * 35;
                const y2 = 38 + Math.sin(rad) * 35;
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.2"
                  />
                );
              })}
            </svg>
          </div>

          {/* Nome CÓRTEX */}
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(36px, 6vw, 54px)",
              letterSpacing: 10,
              color: "#fff",
              lineHeight: 1,
              marginBottom: 6,
              opacity: symbolVisible ? 1 : 0,
              transition: "opacity 0.5s ease 0.2s",
            }}
          >
            CÓRTEX
          </div>

          {/* Subtítulo */}
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.28)",
              textTransform: "uppercase",
              marginBottom: 44,
              opacity: symbolVisible ? 1 : 0,
              transition: "opacity 0.5s ease 0.35s",
            }}
          >
            Sistema Central de Design
          </div>

          {/* Contador */}
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.45)",
              opacity: symbolVisible ? 1 : 0,
              transition: "opacity 0.4s ease 0.5s",
              fontVariantNumeric: "tabular-nums",
              minWidth: "3ch",
              textAlign: "center",
            }}
          >
            {Math.round(progress).toString().padStart(3, "0")}
          </div>

          {/* Linha de progresso fina */}
          <div
            style={{
              width: "min(100px, 26vw)",
              height: 1,
              background: "rgba(255,255,255,0.06)",
              marginTop: 10,
              position: "relative",
              overflow: "hidden",
              opacity: symbolVisible ? 1 : 0,
              transition: "opacity 0.4s ease 0.5s",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${progress}%`,
                background: "rgba(255,255,255,0.35)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
