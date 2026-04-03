import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { GrainOverlay, CustomCursor } from "@/components/CortexShell";

// ─── Toast System ─────────────────────────────────────────────────────────────
let _toastSetter: ((t: { msg: string; type: string; id: number }) => void) | null = null;
export function showToast(msg: string, type: "success" | "error" | "info" = "info") {
  _toastSetter?.({ msg, type, id: Date.now() });
}

function ToastContainer() {
  const [toasts, setToasts] = useState<{ msg: string; type: string; id: number }[]>([]);

  useEffect(() => {
    _toastSetter = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    return () => { _toastSetter = null; };
  }, []);

  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item ${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Scroll Indicator ─────────────────────────────────────────────────────────
function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center gap-2 absolute bottom-10 left-1/2 -translate-x-1/2">
      <div
        style={{
          width: 1,
          height: 40,
          background: "rgba(255,255,255,0.3)",
          animation: "pulseDot 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── Module Frame ─────────────────────────────────────────────────────────────
interface ModuleFrameProps {
  number: string;
  name: string;
  subtitle: string;
  route?: string;
  comingSoon?: boolean;
  reverse?: boolean;
}

function ModuleFrame({ number, name, subtitle, route, comingSoon, reverse }: ModuleFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll(".reveal").forEach((r) => r.classList.add("visible"));
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={`module-frame${reverse ? " reverse" : ""}`}
      style={{ opacity: comingSoon ? 0.4 : 1 }}
    >
      {/* Text side */}
      <div className="flex flex-col gap-5">
        <div className="reveal">
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "#666",
              letterSpacing: 3,
            }}
          >
            {number}
          </span>
        </div>

        <div className="reveal reveal-d1">
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(48px, 8vw, 80px)",
              lineHeight: 1,
              letterSpacing: 2,
              color: "#fff",
            }}
          >
            {name}
          </h2>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "#666",
              marginTop: 8,
              letterSpacing: 1,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div className="reveal reveal-d2">
          {comingSoon ? (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: 2,
                padding: "4px 10px",
                border: "1px solid #2a2a2a",
                color: "#666",
                textTransform: "uppercase",
              }}
            >
              EM BREVE
            </span>
          ) : (
            <Link href={route || "/"}>
              <button className="btn-cortex" data-hover>
                → Acessar
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Preview side */}
      <div className="reveal reveal-d3">
        <div
          style={{
            aspectRatio: "16/9",
            background: "#0d0d0d",
            border: "1px solid #2a2a2a",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Diagonal pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.015) 20px, rgba(255,255,255,0.015) 21px)",
            }}
          />
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 40,
              color: "rgba(255,255,255,0.06)",
              letterSpacing: 8,
              position: "relative",
              zIndex: 1,
            }}
          >
            {name}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Spine (coluna vertebral) ─────────────────────────────────────────────────
function Spine() {
  const markerRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const spine = spineRef.current;
      const marker = markerRef.current;
      if (!spine || !marker) return;

      const rect = spine.getBoundingClientRect();
      const spineTop = spine.offsetTop;
      const spineHeight = spine.offsetHeight;
      const scrollY = window.scrollY;

      const progress = Math.max(
        0,
        Math.min(1, (scrollY - spineTop + window.innerHeight * 0.5) / spineHeight)
      );
      marker.style.top = `${progress * (spineHeight - 8)}px`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={spineRef}
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        bottom: 0,
        width: 1,
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    >
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.12)",
        }}
      />
      {/* Animated diamond marker */}
      <div
        ref={markerRef}
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 7,
          height: 7,
          border: "1px solid rgba(255,255,255,0.5)",
          transform: "translateX(-50%) rotate(45deg)",
          background: "#000",
          transition: "top 0.08s linear",
        }}
      />
    </div>
  );
}

// ─── Parallax wrapper ─────────────────────────────────────────────────────────
function ParallaxSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const offset = (rect.top / window.innerHeight) * 20;
      el.style.transform = `translateY(${offset}px)`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return <div ref={ref}>{children}</div>;
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Home() {
  const manifestoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Manifesto reveal
    const el = manifestoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add("visible");
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <GrainOverlay />
      <CustomCursor />
      <ToastContainer />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#000",
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(64px, 12vw, 130px)",
              lineHeight: 1,
              letterSpacing: 4,
              color: "#fff",
              animation: "fadeUp 1s ease forwards",
            }}
          >
            CÓRTEX
          </h1>

          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              letterSpacing: 6,
              color: "#555",
              marginTop: 16,
              textTransform: "uppercase",
              animation: "fadeUp 1s ease 0.2s both",
            }}
          >
            O sistema central de design
          </p>

          {/* Horizontal line */}
          <div
            style={{
              width: "40%",
              height: 1,
              background: "rgba(255,255,255,0.2)",
              margin: "28px auto 0",
              animation: "fadeIn 1.2s ease 0.4s both",
            }}
          />
        </div>

        <ScrollIndicator />
      </section>

      {/* ── MANIFESTO ────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 24px",
          display: "flex",
          justifyContent: "center",
          background: "#000",
        }}
      >
        <div
          ref={manifestoRef}
          className="reveal"
          style={{
            maxWidth: 480,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 12,
              color: "#555",
              lineHeight: 1.9,
              letterSpacing: 1,
            }}
          >
            "Ferramentas para quem cria.
            <br />
            Não um produto. Um sistema."
          </p>
        </div>
      </section>

      {/* ── MODULES SECTION (with spine) ─────────────────────────────────── */}
      <section
        style={{
          background: "#000",
          position: "relative",
          padding: "0 0 120px",
        }}
      >
        {/* Label */}
        <div
          style={{
            textAlign: "center",
            padding: "0 24px 40px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 4,
              color: "#333",
              textTransform: "uppercase",
            }}
          >
            módulos do sistema
          </span>
        </div>

        {/* Spine container */}
        <div style={{ position: "relative" }}>
          <Spine />

          {/* Module frames */}
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 40px",
            }}
          >
            <ParallaxSection>
              <ModuleFrame
                number="01"
                name="ARQUIVO"
                subtitle="Galeria de prompts para geração de imagens com IA"
                route="/arquivo"
              />
            </ParallaxSection>

            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.05)",
                margin: "0 0",
              }}
            />

            <ParallaxSection>
              <ModuleFrame
                number="02"
                name="PALCO"
                subtitle="Templates e prompts para apresentações profissionais"
                comingSoon
                reverse
              />
            </ParallaxSection>

            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.05)",
                margin: "0 0",
              }}
            />

            <ParallaxSection>
              <ModuleFrame
                number="03"
                name="???"
                subtitle="Em desenvolvimento"
                comingSoon
              />
            </ParallaxSection>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "40px 24px",
          textAlign: "center",
          background: "#000",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            letterSpacing: 3,
            color: "#333",
            textTransform: "uppercase",
          }}
        >
          CÓRTEX
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            color: "#2a2a2a",
            marginTop: 6,
            textTransform: "uppercase",
          }}
        >
          © 2026 — Sistema Central de Design
        </p>
      </footer>
    </>
  );
}
