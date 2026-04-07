import { useEffect, useRef, useState, useCallback } from "react";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { getLoginUrl } from "@/const";
import { GrainOverlay } from "@/components/CortexShell";

// ─── Dados dos módulos ────────────────────────────────────────────────────────
const MODULES = [
  {
    number: "00",
    name: "NEXUS",
    tagline: "Seu agente criativo pessoal",
    description:
      "O centro de progressão do CÓRTEX. Cada ação dentro do sistema gera XP, sobe de rank e desbloqueia novas capacidades para o seu agente. Quanto mais você cria, mais poderoso o sistema se torna.",
    accent: "#a78bfa",
    available: true,
  },
  {
    number: "01",
    name: "ARQUIVO",
    tagline: "Biblioteca de prompts automotivos",
    description:
      "Uma coleção editorial de prompts de alta precisão para geração de imagens automotivas com IA. Edite, refine e gere diretamente com Anthropic e Freepik — sem sair do sistema.",
    accent: "#60a5fa",
    available: true,
  },
  {
    number: "02",
    name: "VERSO",
    tagline: "Gerador de copy e textos criativos",
    description:
      "Crie captions, anúncios, headlines e emails com IA configurada para a voz da sua marca. Cada texto gerado é único, estratégico e acumula XP no seu agente.",
    accent: "#34d399",
    available: true,
  },
  {
    number: "03",
    name: "FORMA",
    tagline: "Briefing inteligente para clientes",
    description:
      "Crie formulários de briefing com a identidade da sua marca. Envie o link ao cliente, receba respostas estruturadas e gere análises com IA — tudo centralizado em um só lugar.",
    accent: "#f59e0b",
    available: true,
  },
  {
    number: "05",
    name: "PALCO",
    tagline: "Templates para apresentações profissionais",
    description:
      "Composições visuais para apresentar projetos, moodboards e conceitos criativos com precisão editorial. Para quem não aceita apresentações genéricas.",
    accent: "#f472b6",
    available: false,
  },
  {
    number: "06",
    name: "ESTÚDIO",
    tagline: "Ferramentas de composição visual",
    description:
      "Ambiente de criação para composições complexas com múltiplas referências, camadas e estilos. O ateliê digital do profissional criativo.",
    accent: "#fb923c",
    available: false,
  },
];

// ─── Carrossel ────────────────────────────────────────────────────────────────
function ModuleCarousel() {
  const [active, setActive] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number, dir: "left" | "right" = "right") => {
    if (isAnimating) return;
    setAnimDir(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setActive(index);
      setIsAnimating(false);
    }, 350);
  }, [isAnimating]);

  const next = useCallback(() => {
    goTo((active + 1) % MODULES.length, "right");
  }, [active, goTo]);

  const prev = useCallback(() => {
    goTo((active - 1 + MODULES.length) % MODULES.length, "left");
  }, [active, goTo]);

  // Auto-avanço a cada 5s
  useEffect(() => {
    intervalRef.current = setInterval(next, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [next]);

  // Pausar no hover
  const pause = () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  const resume = () => { intervalRef.current = setInterval(next, 5000); };

  const mod = MODULES[active];

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}
    >
      {/* Card principal */}
      <div style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "clamp(40px, 6vw, 72px)",
        position: "relative",
        overflow: "hidden",
        minHeight: 320,
        transition: "border-color 0.4s ease",
        borderColor: `${mod.accent}22`,
      }}>
        {/* Glow de fundo */}
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          background: `radial-gradient(ellipse at 80% 50%, ${mod.accent}0a 0%, transparent 70%)`,
          pointerEvents: "none",
          transition: "background 0.6s ease",
        }} />

        {/* Número grande fantasma */}
        <div style={{
          position: "absolute",
          right: "clamp(24px, 4vw, 48px)",
          bottom: -20,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(100px, 16vw, 180px)",
          color: "rgba(255,255,255,0.025)",
          lineHeight: 1,
          letterSpacing: -4,
          userSelect: "none",
          pointerEvents: "none",
        }}>{mod.number}</div>

        {/* Conteúdo animado */}
        <div style={{
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating
            ? `translateX(${animDir === "right" ? "-30px" : "30px"})`
            : "translateX(0)",
          transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)",
          position: "relative",
          zIndex: 1,
        }}>
          {/* Tag */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: mod.accent,
              letterSpacing: 3,
              border: `1px solid ${mod.accent}44`,
              padding: "3px 10px",
            }}>{mod.number}</span>
            {!mod.available && (
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 8,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "3px 8px",
              }}>EM BREVE</span>
            )}
          </div>

          {/* Nome */}
          <h3 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(52px, 8vw, 96px)",
            lineHeight: 0.92,
            letterSpacing: 2,
            color: "#fff",
            margin: "0 0 12px",
          }}>{mod.name}</h3>

          {/* Tagline */}
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: 1,
            margin: "0 0 20px",
          }}>{mod.tagline}</p>

          {/* Descrição */}
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.75,
            maxWidth: 520,
            margin: 0,
          }}>{mod.description}</p>
        </div>

        {/* Barra de progresso */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,0.05)",
        }}>
          <div style={{
            height: "100%",
            background: mod.accent,
            width: `${((active + 1) / MODULES.length) * 100}%`,
            transition: "width 0.4s ease, background 0.4s ease",
          }} />
        </div>
      </div>

      {/* Controles */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 24,
        padding: "0 4px",
      }}>
        {/* Dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {MODULES.map((m, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > active ? "right" : "left")}
              style={{
                width: i === active ? 24 : 6,
                height: 6,
                borderRadius: 3,
                background: i === active ? mod.accent : "rgba(255,255,255,0.15)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "width 0.3s ease, background 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Setas */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={prev}
            style={{
              width: 40,
              height: 40,
              background: "none",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)"; }}
          >←</button>
          <button
            onClick={next}
            style={{
              width: 40,
              height: 40,
              background: "none",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)"; }}
          >→</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Sobre() {
  const { navigateTo } = usePageTransition();
  const loginUrl = getLoginUrl();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <GrainOverlay />

      <div style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
      }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px clamp(24px, 5vw, 60px)",
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {/* Logo */}
          <button
            onClick={() => navigateTo("/")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 4,
              color: "#fff",
              padding: 0,
            }}
          >CÓRTEX</button>

          {/* Botões auth */}
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href={loginUrl}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "8px 20px",
                transition: "color 0.2s, border-color 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.4)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
            >LOGIN</a>
            <a
              href={loginUrl}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                color: "#000",
                textDecoration: "none",
                background: "#fff",
                padding: "8px 20px",
                transition: "background 0.2s, color 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.85)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#fff"; }}
            >CADASTRE-SE</a>
          </div>
        </header>

        {/* ── CONTEÚDO ────────────────────────────────────────────────────── */}
        <main style={{
          paddingTop: "clamp(100px, 14vh, 140px)",
          paddingBottom: "clamp(64px, 10vh, 120px)",
          padding: "clamp(100px, 14vh, 140px) clamp(24px, 6vw, 80px) clamp(64px, 10vh, 120px)",
          maxWidth: 1100,
          margin: "0 auto",
        }}>

          {/* Tag */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
            marginBottom: 32,
          }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "4px 12px",
            }}>Sistema Central de Design</span>
          </div>

          {/* Título */}
          <div style={{ overflow: "hidden", marginBottom: 8 }}>
            <h1 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(52px, 8vw, 96px)",
              lineHeight: 0.92,
              letterSpacing: 2,
              color: "#fff",
              margin: 0,
              transform: visible ? "translateY(0)" : "translateY(110%)",
              transition: "transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s",
            }}>O QUE É O CÓRTEX?</h1>
          </div>

          {/* Linha divisória */}
          <div style={{
            width: visible ? "100%" : "0%",
            height: 1,
            background: "rgba(255,255,255,0.08)",
            transition: "width 1s cubic-bezier(0.16,1,0.3,1) 0.5s",
            marginBottom: 40,
          }} />

          {/* Texto conceitual */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(32px, 5vw, 64px)",
            marginBottom: "clamp(64px, 10vw, 96px)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s",
          }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "clamp(15px, 1.6vw, 18px)",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.8,
              margin: 0,
            }}>
              O CÓRTEX é um sistema operacional para profissionais criativos. Não é um app. Não é uma plataforma. É uma infraestrutura de trabalho construída para quem vive de criar — e que não aceita ferramentas mediocres.
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "clamp(15px, 1.6vw, 18px)",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.8,
              margin: 0,
            }}>
              Cada módulo resolve um problema real do processo criativo: gerar prompts com precisão, escrever textos que soam humanos, coletar briefings de clientes sem atrito. Tudo conectado, tudo acumulando no seu agente pessoal — o NEXUS.
            </p>
          </div>

          {/* Divisor de seção */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: "clamp(40px, 6vw, 64px)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease 0.7s",
          }}>
            <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.15)" }} />
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}>módulos do sistema</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Carrossel */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.8s ease 0.8s, transform 0.8s ease 0.8s",
          }}>
            <ModuleCarousel />
          </div>

          {/* CTA final */}
          <div style={{
            marginTop: "clamp(64px, 10vw, 96px)",
            textAlign: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 1s",
          }}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: 2,
              marginBottom: 24,
            }}>Pronto para começar?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href={loginUrl}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  color: "#000",
                  textDecoration: "none",
                  background: "#fff",
                  padding: "14px 36px",
                  transition: "background 0.2s",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.85)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#fff"; }}
              >CRIAR CONTA</a>
              <button
                onClick={() => navigateTo("/")}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  color: "rgba(255,255,255,0.5)",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "14px 36px",
                  cursor: "pointer",
                  transition: "color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.35)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              >← VOLTAR</button>
            </div>
          </div>
        </main>

        {/* ── FOOTER SIMPLES ───────────────────────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "24px clamp(24px, 5vw, 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 4, color: "rgba(255,255,255,0.1)" }}>CÓRTEX</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.15)" }}>© 2026 — Sistema Central de Design</span>
        </footer>
      </div>
    </>
  );
}
