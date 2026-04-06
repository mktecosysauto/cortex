/**
 * RankUpOverlay — Efeito cinematográfico de level-up
 *
 * Exibido quando o usuário sobe de rank.
 * Mostra: overlay fullscreen preto, SAPO em sapoCelebra, nome do novo rank
 * em letras grandes, e partículas brancas minimalistas.
 *
 * Uso:
 *   const { showRankUp, triggerRankUp } = useRankUp();
 *   <RankUpOverlay show={showRankUp} rankName="ESBOÇO" rankColor="#aaa" onDone={() => setShowRankUp(false)} />
 */

import { useEffect, useRef, useState } from "react";
import SapoAgent from "./SapoAgent";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

interface RankUpOverlayProps {
  show: boolean;
  rankName: string;
  rankColor: string;
  onDone: () => void;
}

export default function RankUpOverlay({ show, rankName, rankColor, onDone }: RankUpOverlayProps) {
  const [phase, setPhase] = useState<"hidden" | "in" | "hold" | "out">("hidden");
  const [particles, setParticles] = useState<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);

  useEffect(() => {
    if (!show) return;

    setPhase("in");

    // Gerar partículas iniciais
    const initial: Particle[] = Array.from({ length: 40 }, () => ({
      id: particleIdRef.current++,
      x: 30 + Math.random() * 40, // % horizontal
      y: 30 + Math.random() * 40, // % vertical
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.1 - Math.random() * 0.2,
      size: 1 + Math.random() * 3,
      opacity: 0.4 + Math.random() * 0.6,
      life: 1,
    }));
    setParticles(initial);

    // Animar partículas
    let lastTime = performance.now();
    function animateParticles(now: number) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt * 0.1,
            y: p.y + p.vy * dt * 0.1,
            life: p.life - 0.008 * dt * 0.1,
            opacity: p.opacity * (1 - 0.005 * dt * 0.1),
          }))
          .filter(p => p.life > 0)
      );
      animFrameRef.current = requestAnimationFrame(animateParticles);
    }
    animFrameRef.current = requestAnimationFrame(animateParticles);

    // Sequência de fases
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 2800);
    const t3 = setTimeout(() => {
      setPhase("hidden");
      setParticles([]);
      onDone();
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "hidden") return null;

  const opacity = phase === "in" ? 1 : phase === "out" ? 0 : 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        background: "rgba(0,0,0,0.96)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transition: phase === "out" ? "opacity 0.4s ease-in" : "opacity 0.3s ease-out",
        pointerEvents: phase === "out" ? "none" : "all",
        overflow: "hidden",
      }}
    >
      {/* Grain */}
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

      {/* Partículas */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: p.opacity * p.life,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Glow radial na cor do rank */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rankColor}20 0%, ${rankColor}08 40%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Label RANK UP */}
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: 6,
          color: rankColor,
          opacity: 0.7,
          marginBottom: 16,
          textTransform: "uppercase",
          transform: phase === "in" ? "translateY(10px)" : "translateY(0)",
          transition: "transform 0.5s ease-out",
        }}
      >
        RANK UP
      </div>

      {/* SAPO celebrando */}
      <div
        style={{
          transform: phase === "in" ? "translateY(20px) scale(0.9)" : "translateY(0) scale(1)",
          transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <SapoAgent skin="base" state="celebrate" size={200} />
      </div>

      {/* Nome do novo rank */}
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(52px, 12vw, 100px)",
          letterSpacing: 8,
          color: rankColor,
          lineHeight: 1,
          marginTop: 8,
          textShadow: `0 0 60px ${rankColor}60`,
          transform: phase === "in" ? "translateY(20px)" : "translateY(0)",
          transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}
      >
        {rankName}
      </div>

      {/* Subtítulo */}
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: 4,
          color: `${rankColor}66`,
          marginTop: 12,
          textTransform: "uppercase",
        }}
      >
        Novo rank desbloqueado
      </div>
    </div>
  );
}
