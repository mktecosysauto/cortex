import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [glitching, setGlitching] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated, loading]);

  // Periodic glitch on title
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const loginUrl = getLoginUrl();

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Grain overlay */}
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, opacity: 0.35 }}>
        <filter id="login-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#login-grain)" />
      </svg>

      {/* Vertical spine */}
      <div style={{
        position: "fixed",
        left: "50%",
        top: 0,
        bottom: 0,
        width: 1,
        background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 80%, transparent)",
        transform: "translateX(-50%)",
        zIndex: 1,
      }} />

      {/* Corner marks */}
      {[
        { top: 24, left: 24 },
        { top: 24, right: 24 },
        { bottom: 24, left: 24 },
        { bottom: 24, right: 24 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: "fixed",
          ...pos,
          width: 16,
          height: 16,
          borderTop: i < 2 ? "1px solid rgba(255,255,255,0.15)" : "none",
          borderBottom: i >= 2 ? "1px solid rgba(255,255,255,0.15)" : "none",
          borderLeft: i % 2 === 0 ? "1px solid rgba(255,255,255,0.15)" : "none",
          borderRight: i % 2 === 1 ? "1px solid rgba(255,255,255,0.15)" : "none",
          zIndex: 2,
        }} />
      ))}

      {/* Main content */}
      <div style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        animation: "fadeUp 0.8s ease forwards",
      }}>

        {/* Label */}
        <div style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 9,
          letterSpacing: 6,
          color: "var(--dim)",
          textTransform: "uppercase",
          marginBottom: 24,
          animation: "fadeUp 0.6s ease 0.1s both",
        }}>
          SISTEMA CENTRAL DE DESIGN
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: "clamp(72px, 15vw, 140px)",
          letterSpacing: 12,
          color: "var(--text)",
          lineHeight: 1,
          marginBottom: 8,
          position: "relative",
          animation: "fadeUp 0.6s ease 0.2s both",
          filter: glitching ? "url(#glitch)" : "none",
          transition: "filter 0.05s",
        }}>
          CÓRTEX
          {glitching && (
            <>
              <span style={{
                position: "absolute",
                inset: 0,
                color: "rgba(255,255,255,0.6)",
                clipPath: "inset(30% 0 40% 0)",
                transform: "translateX(-3px)",
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: "inherit",
                letterSpacing: "inherit",
              }}>CÓRTEX</span>
              <span style={{
                position: "absolute",
                inset: 0,
                color: "rgba(255,255,255,0.4)",
                clipPath: "inset(60% 0 10% 0)",
                transform: "translateX(3px)",
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: "inherit",
                letterSpacing: "inherit",
              }}>CÓRTEX</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div style={{
          width: 120,
          height: 1,
          background: "rgba(255,255,255,0.2)",
          marginBottom: 32,
          animation: "fadeUp 0.6s ease 0.3s both",
        }} />

        {/* Tagline */}
        <div style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 11,
          letterSpacing: 3,
          color: "var(--mid)",
          marginBottom: 64,
          textAlign: "center",
          animation: "fadeUp 0.6s ease 0.4s both",
        }}>
          "Ferramentas para quem cria. Não um produto. Um sistema."
        </div>

        {/* Login button */}
        <a
          href={loginUrl}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "DM Mono, monospace",
            fontSize: 11,
            letterSpacing: 4,
            color: hovered ? "var(--bg)" : "var(--text)",
            background: hovered ? "var(--text)" : "transparent",
            border: "1px solid var(--text)",
            padding: "16px 40px",
            textDecoration: "none",
            textTransform: "uppercase",
            transition: "all 0.25s ease",
            animation: "fadeUp 0.6s ease 0.5s both",
            cursor: "none",
          }}
        >
          <span style={{ fontSize: 14 }}>→</span>
          ENTRAR COM MANUS
        </a>

        {/* Sub-label */}
        <div style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 8,
          letterSpacing: 3,
          color: "var(--dim)",
          marginTop: 20,
          animation: "fadeUp 0.6s ease 0.6s both",
        }}>
          AUTENTICAÇÃO VIA MANUS OAUTH
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 9,
            letterSpacing: 3,
            color: "var(--dim)",
            marginTop: 12,
          }}>
            VERIFICANDO SESSÃO<span style={{ animation: "blink 1s step-end infinite" }}>...</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "DM Mono, monospace",
        fontSize: 8,
        letterSpacing: 4,
        color: "var(--dim)",
        zIndex: 10,
        whiteSpace: "nowrap",
      }}>
        CÓRTEX © 2026
      </div>

      {/* Scan line animation */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background: "rgba(255,255,255,0.06)",
        animation: "scanLine 8s linear infinite",
        zIndex: 5,
        pointerEvents: "none",
      }} />
    </div>
  );
}
