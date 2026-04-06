/**
 * AgentProfile — Perfil público do agente
 * Rota: /agente/:id
 *
 * Exibe: SAPO com skin ativa, rank, XP, conquistas desbloqueadas, streak.
 * Pode ser compartilhado como link.
 */

import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SapoAgent from "@/components/SapoAgent";
import { RANKS, getCurrentRank, getXpProgress } from "@/contexts/NexusContext";
import type { SapoSkin } from "@/components/SapoAgent";

// Conquistas disponíveis no sistema (mesmas da página NEXUS)
const ACHIEVEMENTS = [
  { id: "primeiro_prompt",   icon: "◈", name: "PRIMEIRO PROMPT",    desc: "Gerou o primeiro prompt" },
  { id: "prompt_100",        icon: "◈", name: "CENTURIÃO",          desc: "100 prompts gerados" },
  { id: "pomodoro_1",        icon: "◉", name: "PRIMEIRO FOCO",      desc: "Completou a primeira sessão" },
  { id: "pomodoro_streak_3", icon: "◉", name: "TRÍADE",             desc: "3 sessões seguidas" },
  { id: "pomodoro_streak_7", icon: "◉", name: "SEMANA SÓLIDA",      desc: "7 dias com sessão" },
  { id: "imagem_10",         icon: "◇", name: "CRIADOR",            desc: "10 imagens geradas" },
  { id: "rank_2",            icon: "◆", name: "ESBOÇO",             desc: "Alcançou rank ESBOÇO" },
  { id: "rank_3",            icon: "◆", name: "FORMA",              desc: "Alcançou rank FORMA" },
  { id: "rank_4",            icon: "◆", name: "TRAÇO",              desc: "Alcançou rank TRAÇO" },
  { id: "rank_5",            icon: "◆", name: "COMPOSIÇÃO",         desc: "Alcançou rank COMPOSIÇÃO" },
  { id: "rank_6",            icon: "◆", name: "AUTORIA",            desc: "Alcançou rank AUTORIA" },
  { id: "rank_7",            icon: "◆", name: "CÓRTEX",             desc: "Alcançou o rank máximo" },
];

export default function AgentProfile() {
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id ?? "0", 10);

  const { data: profile, isLoading, error } = trpc.cortex.nexus.getPublicProfile.useQuery(
    { userId },
    { enabled: !isNaN(userId) && userId > 0, retry: false }
  );

  if (isNaN(userId) || userId <= 0) {
    return <ProfileError message="ID de agente inválido." />;
  }

  if (isLoading) {
    return <ProfileLoading />;
  }

  if (error || !profile) {
    return <ProfileError message="Agente não encontrado." />;
  }

  const rank = getCurrentRank(profile.xp);
  const progress = getXpProgress(profile.xp);

  // Determinar skin ativa a partir das purchases e agentAppearance
  const purchases = profile.purchases ?? [];
  const activeSkinId = purchases.find((id: string) => id.startsWith("skin-")) as SapoSkin | undefined;
  const activeSkin: SapoSkin = activeSkinId ?? "base";

  // Conquistas desbloqueadas (simuladas a partir do rank e purchases)
  const unlockedAchievements = ACHIEVEMENTS.filter(a => {
    if (a.id.startsWith("rank_")) {
      const rankNum = parseInt(a.id.split("_")[1] ?? "0", 10);
      return rank.id >= rankNum;
    }
    return false; // Outras conquistas precisariam de dados adicionais
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      color: "#fff",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grain */}
      <div style={{
        position: "fixed",
        inset: 0,
        opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Back link */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 32, position: "relative", zIndex: 1 }}>
        <Link href="/" style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: 3,
          color: "#444",
          textDecoration: "none",
          textTransform: "uppercase",
        }}>
          ← CÓRTEX
        </Link>
      </div>

      {/* Card principal */}
      <div style={{
        width: "100%",
        maxWidth: 480,
        border: `1px solid ${rank.color}33`,
        background: "#080808",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
      }}>
        {/* Header do card */}
        <div style={{
          borderBottom: `1px solid ${rank.color}22`,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "#333" }}>
            PERFIL DO AGENTE
          </span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: 2,
            color: rank.color,
            border: `1px solid ${rank.color}44`,
            padding: "2px 8px",
          }}>
            {rank.name}
          </span>
        </div>

        {/* Corpo do card */}
        <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          {/* SAPO */}
          <div style={{ position: "relative" }}>
            {/* Glow */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${rank.color}20 0%, transparent 70%)`,
              filter: "blur(20px)",
              pointerEvents: "none",
            }} />
            <SapoAgent skin={activeSkin} state="idle" size={200} />
          </div>

          {/* Nome do agente */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36,
              letterSpacing: 6,
              color: "#fff",
              lineHeight: 1,
            }}>
              {profile.agentName}
            </div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 3,
              color: `${rank.color}88`,
              marginTop: 6,
            }}>
              #{profile.id} · {rank.name}
            </div>
          </div>

          {/* XP e barra de progresso */}
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#444" }}>
                XP
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: rank.color }}>
                {profile.xp.toLocaleString()}
              </span>
            </div>
            <div style={{ height: 1, background: "#111", position: "relative" }}>
              <div style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${progress}%`,
                background: rank.color,
                transition: "width 1s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333" }}>
                {RANKS.find(r => r.id === rank.id)?.xpMin.toLocaleString()}
              </span>
              {rank.id < 7 && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333" }}>
                  {RANKS.find(r => r.id === rank.id)?.xpMax.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Skins desbloqueadas */}
          {purchases.filter((id: string) => id.startsWith("skin-")).length > 0 && (
            <div style={{ width: "100%" }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: 3,
                color: "#333",
                marginBottom: 12,
                textTransform: "uppercase",
              }}>
                Skins
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {purchases.filter((id: string) => id.startsWith("skin-")).map((skinId: string) => (
                  <div key={skinId} style={{
                    border: `1px solid ${skinId === activeSkinId ? rank.color : "#222"}`,
                    padding: "4px 10px",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    letterSpacing: 2,
                    color: skinId === activeSkinId ? rank.color : "#444",
                    textTransform: "uppercase",
                  }}>
                    {skinId.replace("skin-", "")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conquistas */}
          {unlockedAchievements.length > 0 && (
            <div style={{ width: "100%" }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: 3,
                color: "#333",
                marginBottom: 12,
                textTransform: "uppercase",
              }}>
                Conquistas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {unlockedAchievements.map(a => (
                  <div key={a.id} style={{
                    border: "1px solid #1a1a1a",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <span style={{ color: rank.color, fontSize: 10 }}>{a.icon}</span>
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 8,
                      letterSpacing: 2,
                      color: "#666",
                      textTransform: "uppercase",
                    }}>
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid #111`,
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#222" }}>
            CÓRTEX · Sistema Central de Design
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              letterSpacing: 2,
              color: "#333",
              background: "none",
              border: "1px solid #1a1a1a",
              padding: "4px 10px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Copiar link
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: 4,
        color: "#333",
        animation: "sapoRespira 2s ease-in-out infinite",
      }}>
        CARREGANDO AGENTE...
      </div>
    </div>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    }}>
      <SapoAgent skin="base" state="idle" size={120} />
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: 3,
        color: "#444",
        textTransform: "uppercase",
      }}>
        {message}
      </div>
      <Link href="/" style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        letterSpacing: 2,
        color: "#333",
        textDecoration: "none",
        border: "1px solid #1a1a1a",
        padding: "6px 16px",
      }}>
        ← Voltar
      </Link>
    </div>
  );
}
