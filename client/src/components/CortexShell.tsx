import { useEffect, useRef } from "react";

/**
 * CortexShell — Componentes globais de UI do CÓRTEX:
 * - Grain overlay (textura fotográfica)
 * - Cursor personalizado (mix-blend-mode: exclusion — visível em fundos claros e escuros)
 */
export function GrainOverlay() {
  return <div className="grain-overlay" aria-hidden="true" />;
}

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = (e: MouseEvent) => {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
    };

    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  // Re-attach hover listeners after each render
  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const expand = () => {
      ring.classList.add("expanded");
      dot.classList.add("expanded");
    };
    const shrink = () => {
      ring.classList.remove("expanded");
      dot.classList.remove("expanded");
    };

    const targets = document.querySelectorAll<Element>(
      "a, button, [data-hover], input, textarea, select"
    );
    targets.forEach((n) => {
      n.addEventListener("mouseenter", expand);
      n.addEventListener("mouseleave", shrink);
    });

    return () => {
      targets.forEach((n) => {
        n.removeEventListener("mouseenter", expand);
        n.removeEventListener("mouseleave", shrink);
      });
    };
  });

  return (
    <>
      {/* Dot central — mix-blend-mode: exclusion funciona em claro e escuro */}
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
      {/* Anel externo */}
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
    </>
  );
}
