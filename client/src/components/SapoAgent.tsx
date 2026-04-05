/**
 * SapoAgent — Componente de Agente Visual SAPO
 * Implementado conforme CORTEX_AGENTS_V2.md
 *
 * Skins disponíveis:
 *   base       — sapo sem equipamento (padrão)
 *   skin-espada — sapo guerreiro com espada e capa
 *   skin-mago  — sapo mago com chapéu e cajado
 *
 * Estados:
 *   idle    → animação sapoRespira (3.8s loop)
 *   focused → animação sapoFocado (5s loop, quando PULSO ativo)
 *   celebrate → animação sapoCelebra (0.6s × 3, ao ganhar XP/rank up)
 *
 * Piscar aleatório: intervalo 3–7s, duração 120ms
 */

import { useEffect, useRef, useState } from "react";

// CDN URLs dos PNGs enviados via manus-upload-file --webdev
const SKIN_URLS: Record<string, string> = {
  base: "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/base_f26b4360.png",
  "skin-espada": "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/skin-espada_a1dbf67e.png",
  "skin-mago": "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/skin-mago_98b68b94.png",
};

export type SapoState = "idle" | "focused" | "celebrate";
export type SapoSkin = "base" | "skin-espada" | "skin-mago";

interface SapoAgentProps {
  /** Skin atual do agente */
  skin?: SapoSkin;
  /** Estado de animação */
  state?: SapoState;
  /** Tamanho em pixels (largura = altura) */
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
  const imgRef = useRef<HTMLImageElement>(null);

  // Sincronizar estado externo
  useEffect(() => {
    setCurrentState(state);
  }, [state]);

  // Piscar aleatório: intervalo 3–7s, duração 120ms
  useEffect(() => {
    function scheduleBlink() {
      const delay = 3000 + Math.random() * 4000; // 3–7s
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

  // Classe de animação baseada no estado
  const stateClass =
    currentState === "celebrate"
      ? "sapo-celebra"
      : currentState === "focused"
      ? "sapo-focado"
      : "sapo-animado";

  const skinUrl = SKIN_URLS[skin] ?? SKIN_URLS["base"];

  return (
    <div
      className={`sapo-wrapper ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        ref={imgRef}
        src={skinUrl}
        alt={`SAPO — ${skin}`}
        className={`sapo-img ${stateClass}`}
        onAnimationEnd={handleAnimationEnd}
        draggable={false}
      />
      {/* Overlay de piscar — cobre os olhos do sapo */}
      <div
        className={`sapo-blink-overlay${isBlinking ? " piscando" : ""}`}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Hook utilitário para controlar o estado do SAPO externamente.
 * Expõe celebrate() que dispara a animação e volta para idle.
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
