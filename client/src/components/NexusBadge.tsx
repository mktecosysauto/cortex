import { useNexus, renderAgentSVG, getXpProgress } from "@/contexts/NexusContext";
import { usePageTransition } from "@/contexts/PageTransitionContext";

export default function NexusBadge() {
  const { nexus, getCurrentRankData } = useNexus();
  const { navigateTo } = usePageTransition();
  const rank = getCurrentRankData();
  const pct = getXpProgress(nexus.xp);
  const agentSvg = renderAgentSVG("mini", rank.color, nexus.agentAppearance.effectId, nexus.agentAppearance.silhouetteId);

  return (
    <button
      onClick={() => navigateTo("/nexus")}
      title="Abrir NEXUS"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "1px solid #2a2a2a",
        padding: "5px 10px",
        cursor: "none",
        transition: "border-color 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#555")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
    >
      {/* Agent mini SVG */}
      <div style={{ width: 20, height: 20, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: agentSvg }} />

      {/* Rank + XP */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: 2, color: rank.color, lineHeight: 1 }}>
          {rank.name}
        </span>
        {/* XP mini bar */}
        <div style={{ width: 48, height: 2, background: "#2a2a2a" }}>
          <div style={{ height: "100%", background: rank.color, width: `${pct}%`, transition: "width 0.6s ease" }} />
        </div>
      </div>

      {/* Glifos */}
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#666", letterSpacing: 1, marginLeft: 2 }}>
        ⬡{nexus.glifos}
      </span>
    </button>
  );
}
