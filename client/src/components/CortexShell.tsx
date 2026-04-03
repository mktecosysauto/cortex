import { useEffect, useRef } from "react";

/**
 * CortexShell — Componentes globais de UI do CÓRTEX:
 * - Grain overlay (textura fotográfica)
 * - Cursor personalizado (círculo branco com mix-blend-mode: difference)
 */
export function GrainOverlay() {
  return <div className="grain-overlay" aria-hidden="true" />;
}

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };

    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  // Re-attach hover listeners after each render
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const expand = () => el.classList.add("expanded");
    const shrink = () => el.classList.remove("expanded");

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

  return <div ref={ref} className="custom-cursor" aria-hidden="true" />;
}
