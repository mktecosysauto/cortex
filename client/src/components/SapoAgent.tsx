/**
 * SapoAgent — Componente de Agente Visual SAPO
 * Implementado conforme CORTEX_AGENTS_V2.md
 *
 * Skins disponíveis:
 *   base        — sapo sem equipamento (padrão)
 *   skin-espada — sapo guerreiro com espada e capa
 *   skin-mago   — sapo mago com chapéu e cajado
 *
 * Estados:
 *   idle      → animação sapoRespira (3.8s loop)
 *   focused   → animação sapoFocado (5s loop, quando PULSO ativo)
 *   celebrate → animação sapoCelebra (0.6s × 3, ao ganhar XP/rank up)
 *
 * Piscar aleatório: intervalo 3–7s, duração 120ms via scaleY(0.08) nos olhos
 *
 * NOTA: os @keyframes sapoRespira/sapoFocado/sapoCelebra estão definidos
 * FORA do @layer components no index.css para ficarem acessíveis globalmente.
 */

import { useEffect, useRef, useState } from "react";

// CDN URLs dos PNGs
const SKIN_URLS: Record<string, string> = {
  base: "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/base_72592774.png",
  "skin-espada": "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/skin-espada_a1dbf67e.png",
  "skin-mago": "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/skin-mago_de5ef879.png",
};

export type SapoState = "idle" | "focused" | "celebrate";
export type SapoSkin = "base" | "skin-espada" | "skin-mago";

interface SapoAgentProps {
  /** Skin atual do agente */
  skin?: SapoSkin;
  /** Estado de animação */
  state?: SapoState;
  /** Tamanho em pixels (largura) — altura é proporcional (×1.2) */
  size?: number;
  /** Classe CSS extra para o wrapper */
  className?: string;
  /** Callback chamado ao fim da animação celebrate */
  onCelebrateEnd?: () => void;
}

export default function SapoAgent({
  skin = "base",
  state = "idle",
  size = 200,
  className = "",
  onCelebrateEnd,
}: SapoAgentProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentState, setCurrentState] = useState<SapoState>(state);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar estado externo
  useEffect(() => {
    setCurrentState(state);
  }, [state]);

  // Piscar aleatório: intervalo 3–7s, duração 120ms
  useEffect(() => {
    function scheduleBlink() {
      const delay = 3000 + Math.random() * 4000;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 120);
      }, delay);
    }
    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Handler para fim da animação celebrate
  function handleAnimationEnd(e: React.AnimationEvent) {
    if (e.animationName === "sapoCelebra" && onCelebrateEnd) {
      onCelebrateEnd();
    }
  }

  // Animação da imagem principal — keyframes definidos globalmente no index.css
  const animationMap: Record<SapoState, string> = {
    idle: "sapoRespira 3.8s ease-in-out infinite",
    focused: "sapoFocado 5s ease-in-out infinite",
    celebrate: "sapoCelebra 0.6s ease-in-out 3",
  };

  const skinUrl = SKIN_URLS[skin] ?? SKIN_URLS["base"];
  const wrapperH = Math.round(size * 1.2);

  return (
    <div
      className={`sapo-wrapper ${className}`}
      style={{
        width: size,
        height: wrapperH,
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      {/* Imagem principal com animação de respirar/focar/celebrar */}
      <img
        src={skinUrl}
        alt={`SAPO — ${skin}`}
        draggable={false}
        onAnimationEnd={handleAnimationEnd}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "bottom center",
          display: "block",
          userSelect: "none",
          transformOrigin: "bottom center",
          animation: animationMap[currentState],
          willChange: "transform",
        }}
      />
      {/*
        Overlay de piscar — usa scaleY(0.08) para "fechar" os olhos.
        Posicionado sobre a região dos olhos do sapo.
        Cor transparente com backdrop-filter para funcionar em qualquer fundo.
        Ajuste top/height conforme o PNG real via DevTools.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "22%",
          left: "20%",
          right: "20%",
          height: "12%",
          background: "currentColor",
          color: "inherit",
          borderRadius: "50%",
          pointerEvents: "none",
          transformOrigin: "center center",
          transform: isBlinking ? "scaleY(0.08)" : "scaleY(0)",
          transition: isBlinking
            ? "transform 0.04s ease-out"
            : "transform 0.06s ease-in",
          opacity: isBlinking ? 1 : 0,
          zIndex: 2,
          // Usa a cor do texto herdada — em fundo preto herda branco, em fundo branco herda preto
          mixBlendMode: "difference",
        }}
      />
    </div>
  );
}

/**
 * Hook utilitário para controlar o estado do SAPO externamente.
 */
export function useSapoState(defaultState: SapoState = "idle") {
  const [sapoState, setSapoState] = useState<SapoState>(defaultState);

  function celebrate() {
    setSapoState("celebrate");
  }

  function handleCelebrateEnd() {
    setSapoState("idle");
  }

  return { sapoState, setSapoState, celebrate, handleCelebrateEnd };
}
