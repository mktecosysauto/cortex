import { useEffect, useRef, useState } from "react";
import { GrainOverlay, CustomCursor } from "@/components/CortexShell";
import { GlobalHeader } from "@/components/GlobalHeader";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { useNexus } from "@/contexts/NexusContext";
import SapoAgent from "@/components/SapoAgent";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

// ─── Toast ────────────────────────────────────────────────────────────────────
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
        <div key={t.id} className={`toast-item ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── Spine (coluna vertebral) ─────────────────────────────────────────────────
// Runs full height of the page, visible at all times as background element
function GlobalSpine() {
  const lineRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const marker = markerRef.current;
      const glow = glowRef.current;
      const line = lineRef.current;
      if (!marker || !line) return;

      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docH > 0 ? Math.min(1, window.scrollY / docH) : 0;
      const lineH = line.offsetHeight;

      marker.style.top = `${progress * (lineH - 10)}px`;
      if (glow) glow.style.top = `${progress * (lineH - 40)}px`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: 0,
        bottom: 0,
        width: 1,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* Main line */}
      <div
        ref={lineRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.18) 10%, rgba(255,255,255,0.18) 90%, transparent 100%)",
        }}
      />
      {/* Glow blob that follows scroll */}
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 120,
          height: 80,
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, transparent 70%)",
          transition: "top 0.1s linear",
          pointerEvents: "none",
        }}
      />
      {/* Diamond marker */}
      <div
        ref={markerRef}
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 9,
          height: 9,
          border: "1px solid rgba(255,255,255,0.8)",
          transform: "translateX(-50%) rotate(45deg)",
          background: "#000",
          transition: "top 0.08s linear",
          boxShadow: "0 0 8px rgba(255,255,255,0.4)",
        }}
      />
      {/* Tick marks at thirds */}
      {[0.33, 0.66].map((p) => (
        <div
          key={p}
          style={{
            position: "absolute",
            left: "50%",
            top: `${p * 100}%`,
            width: 5,
            height: 1,
            background: "rgba(255,255,255,0.25)",
            transform: "translateX(-50%)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Module Frame (scroll-triggered, one at a time) ───────────────────────────
interface ModuleFrameProps {
  number: string;
  name: string;
  subtitle: string;
  description: string;
  route?: string;
  comingSoon?: boolean;
  reverse?: boolean;
  accent?: string;
}

function ModuleFrame({ number, name, subtitle, description, route, comingSoon, reverse, accent = "#fff" }: ModuleFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { navigateTo } = usePageTransition();

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.25, rootMargin: "0px 0px -80px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(60px)",
        transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        className={`module-frame${reverse ? " reverse" : ""}`}
        style={{ opacity: comingSoon ? 0.45 : 1 }}
      >
        {/* Text side */}
        <div className="flex flex-col gap-6">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.1s",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: accent === "#fff" ? "rgba(255,255,255,0.3)" : accent,
                letterSpacing: 4,
                border: `1px solid ${accent === "#fff" ? "rgba(255,255,255,0.12)" : accent}`,
                padding: "3px 8px",
              }}
            >
              {number}
            </span>
            {comingSoon && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  letterSpacing: 2,
                  color: "#444",
                  border: "1px solid #222",
                  padding: "2px 7px",
                  textTransform: "uppercase",
                }}
              >
                EM BREVE
              </span>
            )}
          </div>

          <div
            style={{
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.2s",
            }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(52px, 9vw, 96px)",
                lineHeight: 0.95,
                letterSpacing: 3,
                color: "#fff",
              }}
            >
              {name}
            </h2>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "#555",
                marginTop: 10,
                letterSpacing: 1,
              }}
            >
              {subtitle}
            </p>
          </div>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#888",
              lineHeight: 1.7,
              maxWidth: 380,
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.3s",
            }}
          >
            {description}
          </p>

          <div
            style={{
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.4s",
            }}
          >
            {!comingSoon ? (
              <button
                className="btn-cortex"
                data-hover
                onClick={() => navigateTo(route || "/")}
              >
                → Acessar módulo
              </button>
            ) : (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: "#333",
                  textTransform: "uppercase",
                }}
              >
                — em desenvolvimento
              </span>
            )}
          </div>
        </div>

        {/* Visual side */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.9s ease 0.35s",
          }}
        >
          <div
            style={{
              aspectRatio: "4/3",
              background: "#080808",
              border: `1px solid ${comingSoon ? "#1a1a1a" : "rgba(255,255,255,0.1)"}`,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Grid pattern */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {/* Corner marks */}
            {[
              { top: 12, left: 12 },
              { top: 12, right: 12 },
              { bottom: 12, left: 12 },
              { bottom: 12, right: 12 },
            ].map((pos, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 12,
                  height: 12,
                  borderTop: i < 2 ? `1px solid rgba(255,255,255,0.2)` : "none",
                  borderBottom: i >= 2 ? `1px solid rgba(255,255,255,0.2)` : "none",
                  borderLeft: i % 2 === 0 ? `1px solid rgba(255,255,255,0.2)` : "none",
                  borderRight: i % 2 === 1 ? `1px solid rgba(255,255,255,0.2)` : "none",
                  ...pos,
                }}
              />
            ))}
            {/* Module name watermark */}
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(32px, 6vw, 56px)",
                color: "rgba(255,255,255,0.04)",
                letterSpacing: 10,
                position: "relative",
                zIndex: 1,
                userSelect: "none",
              }}
            >
              {name}
            </span>
            {/* Scan line effect */}
            {!comingSoon && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.015) 50%, transparent 100%)",
                  animation: "scanLine 4s ease-in-out infinite",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function ModuleDivider({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 0",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: visible
            ? "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)"
            : "transparent",
          transition: "background 0.8s ease",
        }}
      />
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 8,
          color: "#2a2a2a",
          letterSpacing: 3,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease 0.2s",
        }}
      >
        {String(index).padStart(2, "0")}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: visible
            ? "linear-gradient(to left, transparent, rgba(255,255,255,0.08), transparent)"
            : "transparent",
          transition: "background 0.8s ease",
        }}
      />
    </div>
  );
}

// ─── NEXUS Frame (frame 00) ──────────────────────────────────────────────────
function NexusFrame() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { nexus, getCurrentRankData } = useNexus();
  const { navigateTo } = usePageTransition();
  const rank = getCurrentRankData();
  const activeSkin = nexus.activeItems.find((id: string) => id.startsWith("skin-")) as any ?? "base";

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(60px)",
        transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div className="module-frame">
        {/* Text side */}
        <div className="flex flex-col gap-6">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: rank.color,
              letterSpacing: 4,
              border: `1px solid ${rank.color}`,
              padding: "3px 8px",
              opacity: 0.7,
            }}>00</span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              letterSpacing: 2,
              color: "#444",
              border: "1px solid #222",
              padding: "2px 7px",
              textTransform: "uppercase",
            }}>SISTEMA CENTRAL</span>
          </div>
          <div>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(52px, 9vw, 96px)",
              lineHeight: 0.95,
              letterSpacing: 3,
              color: rank.color,
            }}>NEXUS</h2>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "#555",
              marginTop: 10,
              letterSpacing: 1,
            }}>Progressão · XP · Ranks · Conquistas</p>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "#888",
            lineHeight: 1.7,
            maxWidth: 380,
          }}>
            Seu sistema de progressão pessoal dentro do CÓRTEX. Cada prompt gerado, imagem criada e sessão de foco concluída constrói o seu AGENTE.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-cortex" data-hover onClick={() => navigateTo("/nexus")} style={{ borderColor: rank.color, color: rank.color }}>
              → Acessar NEXUS
            </button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#444", letterSpacing: 1 }}>
              {rank.name} · {nexus.xp} XP
            </span>
          </div>
        </div>
        {/* Visual side — AGENTE hero redesign */}
        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.9s ease 0.35s", display: "flex", justifyContent: "center" }}>
          <div style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}>
            {/* Glow de fundo na cor do rank */}
            <div style={{
              position: "absolute",
              bottom: 60,
              left: "50%",
              transform: "translateX(-50%)",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${rank.color}18 0%, ${rank.color}06 50%, transparent 75%)`,
              filter: "blur(20px)",
              pointerEvents: "none",
              zIndex: 0,
            }} />
            {/* Grade sutil de fundo */}
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              pointerEvents: "none",
              zIndex: 0,
              maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            }} />
            {/* SAPO 340px */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <SapoAgent skin={activeSkin} state="idle" size={280} />
            </div>
            {/* Nome do agente */}
            <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginTop: -8 }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 22,
                letterSpacing: 6,
                color: rank.color,
                lineHeight: 1,
              }}>{nexus.agentName}</div>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: 3,
                color: `${rank.color}88`,
                marginTop: 4,
                textTransform: "uppercase",
              }}>{rank.name} · {nexus.xp} XP</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Home() {
  const phraseRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(docH > 0 ? Math.min(1, window.scrollY / docH) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = phraseRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <GrainOverlay />
      <CustomCursor />
      <GlobalHeader currentPage="home" />
      <GlobalSpine />
      <ToastContainer />

      {/* ── HERO (70vh) ──────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "clamp(80px, 14vh, 140px)",
          position: "relative",
          background: "#000",
          padding: "clamp(80px, 14vh, 140px) 24px 0",
          zIndex: 2,
        }}
      >
        {/* Top label */}
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: 5,
            color: "#333",
            textTransform: "uppercase",
            marginBottom: 24,
            animation: "fadeIn 1s ease 0.1s both",
          }}
        >
          Sistema Central de Design
        </div>

        {/* Main title */}
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(72px, 14vw, 160px)",
            lineHeight: 0.92,
            letterSpacing: 6,
            color: "#fff",
            animation: "fadeUp 0.9s ease 0.15s both",
            textAlign: "center",
            position: "relative",
          }}
        >
          CÓRTEX
          {/* Glitch underline */}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: "60%",
              height: 1,
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)",
              animation: "fadeIn 1s ease 0.5s both",
            }}
          />
        </h1>

        {/* Phrase — right below the title */}
        <div
          ref={phraseRef}
          className="reveal"
          style={{
            marginTop: 40,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "clamp(11px, 1.4vw, 14px)",
              color: "#666",
              lineHeight: 1.8,
              letterSpacing: 2,
              maxWidth: 420,
            }}
          >
            "Ferramentas para quem cria.
            <br />
            Não um produto. Um sistema."
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            animation: "fadeIn 1.5s ease 0.8s both",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              letterSpacing: 3,
              color: "#333",
              textTransform: "uppercase",
            }}
          >
            scroll
          </span>
          <div
            style={{
              width: 1,
              height: 32,
              background: "rgba(255,255,255,0.2)",
              animation: "pulseDot 2s ease-in-out infinite",
            }}
          />
        </div>
      </section>

      {/* ── MODULES SECTION ──────────────────────────────────────────────── */}
      <section
        style={{
          background: "#000",
          position: "relative",
          padding: "120px 0 160px",
          zIndex: 2,
        }}
      >
        {/* Section label */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 80,
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: 5,
                color: "#333",
                textTransform: "uppercase",
              }}
            >
              módulos do sistema
            </span>
            <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>

        {/* Modules container */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 40px",
          }}
        >
          {/* Frame 00 — NEXUS */}
          <NexusFrame />

          <ModuleDivider index={0} />

          <ModuleFrame
            number="01"
            name="ARQUIVO"
            subtitle="Galeria de prompts automotivos para IA"
            description="Uma biblioteca editorial de prompts de alta precisão para geração de imagens automotivas. Edite, melhore e gere com Anthropic e Freepik."
            route="/arquivo"
          />

          <ModuleDivider index={1} />
          <ModuleFrame
            number="02"
            name="VERSO"
            subtitle="Gerador de copy e textos criativos"
            description="Crie captions, anúncios, headlines e emails com IA. Configure o tom de voz da sua marca e gere textos que soam como você — com XP a cada criação."
            route="/verso"
            reverse
          />
          <ModuleDivider index={2} />
          <ModuleFrame
            number="03"
            name="FORMA"
            subtitle="Briefing inteligente para clientes"
            description="Crie formulários de briefing personalizados com a identidade da sua marca. Envie ao cliente, receba respostas e gere análises com IA — tudo em um só lugar."
            route="/forma"
          />
          <ModuleDivider index={4} />
          <ModuleFrame
            number="05"
            name="PALCO"
            subtitle="Templates para apresentações profissionais"
            description="Composições visuais para apresentar projetos, moodboards e conceitos criativos com precisão editorial."
            comingSoon
            reverse
          />
          <ModuleDivider index={5} />
          <ModuleFrame
            number="06"
            name="ESTÚDIO"
            subtitle="Ferramentas de composição visual"
            description="Ambiente de criação para composições complexas com múltiplas referências, camadas e estilos."
            comingSoon
          />
        </div>

        {/* Progress indicator */}
        <div
          style={{
            position: "absolute",
            right: 32,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 1,
              height: 80,
              background: "#111",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: `${scrollPct * 100}%`,
                background: "rgba(255,255,255,0.4)",
                transition: "height 0.1s linear",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              color: "#333",
              letterSpacing: 1,
              writingMode: "vertical-rl",
              marginTop: 6,
            }}
          >
            {Math.round(scrollPct * 100)}%
          </span>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "48px 24px",
          textAlign: "center",
          background: "#000",
          position: "relative",
          zIndex: 2,
        }}
      >
        <p
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            letterSpacing: 6,
            color: "rgba(255,255,255,0.15)",
          }}
        >
          CÓRTEX
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: 3,
            color: "#2a2a2a",
            marginTop: 8,
            textTransform: "uppercase",
          }}
        >
          © 2026 — Sistema Central de Design
        </p>

        {/* Auth row */}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          {isAuthenticated ? (
            <>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2, color: "#333" }}>
                {user?.name?.toUpperCase()}
              </span>
              {user?.role === "admin" && (
                <button onClick={() => window.location.href = "/admin"} style={{ background: "none", border: "1px solid #222", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "#555", padding: "4px 12px" }}>
                  ADMIN
                </button>
              )}
              <button onClick={() => logout()} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "#333", padding: 0 }}>
                SAIR
              </button>
            </>
          ) : (
            <a href={getLoginUrl()} style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "#444", textDecoration: "none", border: "1px solid #1a1a1a", padding: "6px 16px" }}>
              ENTRAR
            </a>
          )}
        </div>
      </footer>
    </>
  );
}
