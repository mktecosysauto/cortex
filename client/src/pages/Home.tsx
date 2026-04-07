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

// ─── useReveal hook ───────────────────────────────────────────────────────────
function useReveal(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── LineReveal ───────────────────────────────────────────────────────────────
function LineReveal({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} style={{ overflow: "hidden", ...style }}>
      <div style={{
        transform: visible ? "translateY(0)" : "translateY(110%)",
        opacity: visible ? 1 : 0,
        transition: `transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, opacity 0.6s ease ${delay}s`,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Module Card (novo design makemepulse-inspired) ───────────────────────────
interface ModuleCardProps {
  number: string;
  name: string;
  subtitle: string;
  description: string;
  route?: string;
  comingSoon?: boolean;
  accent?: string;
  dark?: boolean;
}

function ModuleCard({ number, name, subtitle, description, route, comingSoon, accent = "#fff", dark = true }: ModuleCardProps) {
  const { ref, visible } = useReveal(0.15);
  const { navigateTo } = usePageTransition();
  const bg = dark ? "#000" : "#f0ede8";
  const fg = dark ? "#fff" : "#0a0a0a";
  const fgDim = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const fgMid = dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";
  const borderC = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

  return (
    <div
      ref={ref}
      style={{
        background: bg,
        borderTop: `1px solid ${borderC}`,
        padding: "clamp(48px, 8vw, 96px) clamp(24px, 6vw, 80px)",
        position: "relative",
        overflow: "hidden",
        opacity: comingSoon ? 0.5 : 1,
      }}
    >
      {/* Large background number */}
      <div style={{
        position: "absolute",
        right: "clamp(24px, 5vw, 60px)",
        top: "50%",
        transform: "translateY(-50%)",
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "clamp(120px, 20vw, 240px)",
        color: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
        lineHeight: 1,
        letterSpacing: -4,
        pointerEvents: "none",
        userSelect: "none",
      }}>
        {number}
      </div>

      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "clamp(32px, 6vw, 80px)",
        alignItems: "center",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Text side */}
        <div>
          {/* Tag row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, overflow: "hidden" }}>
            <div style={{
              transform: visible ? "translateX(0)" : "translateX(-30px)",
              opacity: visible ? 1 : 0,
              transition: `transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s, opacity 0.5s ease 0.05s`,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: fgDim,
                letterSpacing: 3,
                border: `1px solid ${borderC}`,
                padding: "3px 10px",
              }}>{number}</span>
              {comingSoon && (
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  letterSpacing: 2,
                  color: fgDim,
                  border: `1px solid ${borderC}`,
                  padding: "2px 8px",
                }}>EM BREVE</span>
              )}
            </div>
          </div>

          {/* Title — big, line reveal */}
          <div style={{ marginBottom: 16 }}>
            <LineReveal delay={0.1}>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(64px, 10vw, 120px)",
                lineHeight: 0.92,
                letterSpacing: 2,
                color: fg,
                margin: 0,
              }}>{name}</h2>
            </LineReveal>
          </div>

          {/* Subtitle */}
          <LineReveal delay={0.2}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: fgDim,
              letterSpacing: 1,
              margin: "0 0 20px",
            }}>{subtitle}</p>
          </LineReveal>

          {/* Description */}
          <div style={{ overflow: "hidden" }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: fgMid,
              lineHeight: 1.75,
              maxWidth: 420,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              opacity: visible ? 1 : 0,
              transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s, opacity 0.6s ease 0.3s",
              margin: "0 0 32px",
            }}>{description}</p>
          </div>

          {/* CTA */}
          <div style={{
            transform: visible ? "translateY(0)" : "translateY(16px)",
            opacity: visible ? 1 : 0,
            transition: "transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s, opacity 0.5s ease 0.4s",
          }}>
            {!comingSoon ? (
              <button
                onClick={() => navigateTo(route || "/")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  color: fg,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  const line = e.currentTarget.querySelector(".cta-line") as HTMLElement;
                  if (line) line.style.width = "100%";
                }}
                onMouseLeave={(e) => {
                  const line = e.currentTarget.querySelector(".cta-line") as HTMLElement;
                  if (line) line.style.width = "0%";
                }}
              >
                <span style={{ position: "relative" }}>
                  → ACESSAR MÓDULO
                  <span className="cta-line" style={{
                    position: "absolute",
                    bottom: -2,
                    left: 0,
                    height: 1,
                    width: "0%",
                    background: fg,
                    transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                </span>
              </button>
            ) : (
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: 2,
                color: fgDim,
              }}>— em desenvolvimento</span>
            )}
          </div>
        </div>

        {/* Visual side — abstract grid preview */}
        <div style={{
          transform: visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "transform 1s cubic-bezier(0.16,1,0.3,1) 0.2s, opacity 0.8s ease 0.2s",
        }}>
          <div style={{
            aspectRatio: "4/3",
            background: dark ? "#0a0a0a" : "#e8e4de",
            border: `1px solid ${borderC}`,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {/* Grid */}
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }} />
            {/* Corner marks */}
            {[{ top: 12, left: 12 }, { top: 12, right: 12 }, { bottom: 12, left: 12 }, { bottom: 12, right: 12 }].map((pos, i) => (
              <div key={i} style={{
                position: "absolute",
                ...pos,
                width: 12,
                height: 12,
                borderTop: i < 2 ? `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}` : undefined,
                borderBottom: i >= 2 ? `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}` : undefined,
                borderLeft: i % 2 === 0 ? `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}` : undefined,
                borderRight: i % 2 === 1 ? `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}` : undefined,
              }} />
            ))}
            {/* Module name big */}
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(32px, 5vw, 56px)",
              color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              letterSpacing: 8,
              userSelect: "none",
            }}>{name}</span>
            {/* Accent dot */}
            <div style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 12px ${accent}88`,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NEXUS Section ────────────────────────────────────────────────────────────
function NexusSection() {
  const { ref, visible } = useReveal(0.15);
  const { navigateTo } = usePageTransition();
  const { nexus, getCurrentRankData, activeSkin } = useNexus();
  const rank = getCurrentRankData();

  return (
    <div
      ref={ref}
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "clamp(64px, 10vw, 120px) clamp(24px, 6vw, 80px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow de fundo */}
      <div style={{
        position: "absolute",
        top: "50%",
        right: "20%",
        transform: "translate(50%, -50%)",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${rank.color}12 0%, transparent 70%)`,
        filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "clamp(32px, 6vw, 80px)",
        alignItems: "center",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Text */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, overflow: "hidden" }}>
            <div style={{
              transform: visible ? "translateX(0)" : "translateX(-30px)",
              opacity: visible ? 1 : 0,
              transition: "transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s, opacity 0.5s ease 0.05s",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: 3,
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "3px 10px",
              }}>00</span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                color: rank.color,
                letterSpacing: 2,
                border: `1px solid ${rank.color}44`,
                padding: "3px 10px",
              }}>SISTEMA CENTRAL</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <LineReveal delay={0.1}>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(64px, 10vw, 120px)",
                lineHeight: 0.92,
                letterSpacing: 2,
                color: "#fff",
                margin: 0,
              }}>NEXUS</h2>
            </LineReveal>
          </div>

          <LineReveal delay={0.2}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 1,
              margin: "0 0 20px",
            }}>Progressão · XP · Ranks · Conquistas</p>
          </LineReveal>

          <div style={{ overflow: "hidden" }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.75,
              maxWidth: 420,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              opacity: visible ? 1 : 0,
              transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s, opacity 0.6s ease 0.3s",
              margin: "0 0 32px",
            }}>
              Seu sistema de progressão pessoal dentro do CÓRTEX. Cada prompt gerado, imagem criada e sessão de foco concluída constrói o seu AGENTE.
            </p>
          </div>

          <div style={{
            transform: visible ? "translateY(0)" : "translateY(16px)",
            opacity: visible ? 1 : 0,
            transition: "transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s, opacity 0.5s ease 0.4s",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <button
              onClick={() => navigateTo("/nexus")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                color: rank.color,
                padding: 0,
              }}
              onMouseEnter={(e) => {
                const line = e.currentTarget.querySelector(".cta-line") as HTMLElement;
                if (line) line.style.width = "100%";
              }}
              onMouseLeave={(e) => {
                const line = e.currentTarget.querySelector(".cta-line") as HTMLElement;
                if (line) line.style.width = "0%";
              }}
            >
              <span style={{ position: "relative" }}>
                → ACESSAR NEXUS
                <span className="cta-line" style={{
                  position: "absolute",
                  bottom: -2,
                  left: 0,
                  height: 1,
                  width: "0%",
                  background: rank.color,
                  transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
                }} />
              </span>
            </button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              {rank.name} · {nexus.xp} XP
            </span>
          </div>
        </div>

        {/* Sapo */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "transform 1s cubic-bezier(0.16,1,0.3,1) 0.2s, opacity 0.8s ease 0.2s",
        }}>
          <div style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            {/* Grade sutil */}
            <div style={{
              position: "absolute",
              inset: -40,
              backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              pointerEvents: "none",
              maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            }} />
            {/* Sapo flutuante */}
            <div style={{ animation: "sapoFloat 4s ease-in-out infinite", position: "relative", zIndex: 1 }}>
              <SapoAgent skin={(activeSkin ?? undefined) as import("@/components/SapoAgent").SapoSkin | undefined} state="idle" size={260} />
            </div>
            {/* Nome */}
            <div style={{ textAlign: "center", marginTop: -8, position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 6, color: rank.color, lineHeight: 1 }}>
                {nexus.agentName}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: `${rank.color}88`, marginTop: 4 }}>
                {rank.name} · {nexus.xp} XP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { navigateTo } = usePageTransition();
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <GrainOverlay />
      <CustomCursor />
      <GlobalHeader currentPage="home" />
      <ToastContainer />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 clamp(24px, 6vw, 80px) clamp(48px, 8vh, 80px)",
        zIndex: 2,
      }}>
        {/* Top-right label */}
        <div style={{
          position: "absolute",
          top: "clamp(80px, 12vh, 120px)",
          right: "clamp(24px, 6vw, 80px)",
          textAlign: "right",
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s",
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.3)", lineHeight: 1.8 }}>
            SISTEMA CENTRAL<br />DE DESIGN
          </div>
        </div>

        {/* Top-left year */}
        <div style={{
          position: "absolute",
          top: "clamp(80px, 12vh, 120px)",
          left: "clamp(24px, 6vw, 80px)",
          opacity: heroVisible ? 1 : 0,
          transition: "opacity 0.8s ease 0.5s",
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.2)" }}>
            © 2026
          </div>
        </div>

        {/* Main title — asymmetric, massive */}
        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Halo */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "30%",
            transform: "translate(-50%, -50%)",
            width: "60vw",
            height: "60vw",
            maxWidth: 700,
            maxHeight: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          {/* Line 1 — left aligned */}
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(80px, 16vw, 200px)",
              lineHeight: 0.88,
              letterSpacing: -2,
              color: "#fff",
              transform: heroVisible ? "translateY(0)" : "translateY(110%)",
              transition: "transform 1s cubic-bezier(0.16,1,0.3,1) 0.1s",
            }}>CÓRTEX</div>
          </div>

          {/* Line 2 — indented */}
          <div style={{ overflow: "hidden", paddingLeft: "clamp(16px, 4vw, 60px)" }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(80px, 16vw, 200px)",
              lineHeight: 0.88,
              letterSpacing: -2,
              color: "rgba(255,255,255,0.85)",
              transform: heroVisible ? "translateY(0)" : "translateY(110%)",
              transition: "transform 1s cubic-bezier(0.16,1,0.3,1) 0.18s",
            }}>SYSTEM.</div>
          </div>

          {/* Line 3 — right aligned, with period */}
          <div style={{ overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(80px, 16vw, 200px)",
              lineHeight: 0.88,
              letterSpacing: -2,
              color: "rgba(255,255,255,0.7)",
              transform: heroVisible ? "translateY(0)" : "translateY(110%)",
              transition: "transform 1s cubic-bezier(0.16,1,0.3,1) 0.26s",
              display: "none",
            }}>DE DESIGN.</div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: "clamp(32px, 5vh, 56px)",
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.8s ease 0.7s, transform 0.8s ease 0.7s",
          position: "relative",
          zIndex: 2,
        }}>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "clamp(10px, 1.2vw, 13px)",
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.7,
            maxWidth: 320,
            letterSpacing: 1,
          }}>
            "Ferramentas para quem cria.<br />
            Não um produto. Um sistema."
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 3,
              color: "rgba(255,255,255,0.25)",
              animation: "scrollBounce 2s ease-in-out infinite",
            }}>SCROLL ↓</div>
          </div>
        </div>
      </section>

      {/* ── NEXUS ─────────────────────────────────────────────────────────── */}
      <NexusSection />

      {/* ── MÓDULOS ───────────────────────────────────────────────────────── */}
      <ModuleCard
        number="01"
        name="ARQUIVO"
        subtitle="Galeria de prompts automotivos para IA"
        description="Uma biblioteca editorial de prompts de alta precisão para geração de imagens automotivas. Edite, melhore e gere com Anthropic e Freepik."
        route="/arquivo"
        accent="rgba(255,255,255,0.6)"
      />

      <ModuleCard
        number="02"
        name="VERSO"
        subtitle="Gerador de copy e textos criativos"
        description="Crie captions, anúncios, headlines e emails com IA. Configure o tom de voz da sua marca e gere textos que soam como você — com XP a cada criação."
        route="/verso"
        dark={false}
        accent="#0a0a0a"
      />

      <ModuleCard
        number="03"
        name="FORMA"
        subtitle="Briefing inteligente para clientes"
        description="Crie formulários de briefing personalizados com a identidade da sua marca. Envie ao cliente, receba respostas e gere análises com IA — tudo em um só lugar."
        route="/forma"
        accent="rgba(255,255,255,0.6)"
      />

      <ModuleCard
        number="05"
        name="PALCO"
        subtitle="Templates para apresentações profissionais"
        description="Composições visuais para apresentar projetos, moodboards e conceitos criativos com precisão editorial."
        comingSoon
        dark={false}
        accent="#0a0a0a"
      />

      <ModuleCard
        number="06"
        name="ESTÚDIO"
        subtitle="Ferramentas de composição visual"
        description="Ambiente de criação para composições complexas com múltiplas referências, camadas e estilos."
        comingSoon
        accent="rgba(255,255,255,0.6)"
      />

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "clamp(48px, 8vw, 80px) clamp(24px, 6vw, 80px)",
        position: "relative",
        zIndex: 2,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: 4, color: "rgba(255,255,255,0.12)", lineHeight: 1 }}>
              CÓRTEX
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.2)", marginTop: 8 }}>
              © 2026 — Sistema Central de Design
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {isAuthenticated ? (
              <>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)" }}>
                  {user?.name?.toUpperCase()}
                </span>
                {user?.role === "admin" && (
                  <button onClick={() => window.location.href = "/admin"} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "rgba(255,255,255,0.5)", padding: "4px 12px" }}>
                    ADMIN
                  </button>
                )}
                <button onClick={() => logout()} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "rgba(255,255,255,0.3)", padding: 0 }}>
                  SAIR
                </button>
              </>
            ) : (
              <a href={getLoginUrl()} style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 3, color: "rgba(255,255,255,0.4)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 16px" }}>
                ENTRAR
              </a>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
