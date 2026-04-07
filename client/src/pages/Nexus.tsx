import { useState, useEffect } from "react";
import { GrainOverlay, CustomCursor } from "@/components/CortexShell";
import { GlobalHeader } from "@/components/GlobalHeader";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import {
  useNexus,
  RANKS,
} from "@/contexts/NexusContext";
import SapoAgent, { useSapoState, type SapoSkin } from "@/components/SapoAgent";

// ─── Shop items ───────────────────────────────────────────────────────────────
const SHOP_ITEMS = {
  skins: [
    {
      id: "skin-espada",
      name: "Guerreiro",
      desc: "SAPO equipado com espada e capa. Pele exclusiva do agente.",
      price: 600,
      type: "skin",
      skinKey: "skin-espada" as SapoSkin,
    },
    {
      id: "skin-mago",
      name: "Mago",
      desc: "SAPO com chapéu pontudo e cajado arcano. Pele exclusiva do agente.",
      price: 600,
      type: "skin",
      skinKey: "skin-mago" as SapoSkin,
    },
  ],
  appearance: [
    { id: "palette_warm",       name: "Paleta Quente",         desc: "Tons âmbar e terracota para o seu AGENTE.",                price: 150, type: "palette" },
    { id: "palette_cold",       name: "Paleta Fria",           desc: "Tons azul profundo e ciano para o seu AGENTE.",            price: 150, type: "palette" },
    { id: "silhouette_angular", name: "Silhueta Angular",      desc: "Forma geométrica mais agressiva e definida.",              price: 300, type: "silhouette" },
    { id: "effect_glow",        name: "Efeito Glow",           desc: "Aura luminosa ao redor do seu AGENTE.",                   price: 500, type: "effect" },
    { id: "title_senior",       name: "Título: SÊNIOR",        desc: "Exibido abaixo do nome do seu AGENTE.",                   price: 200, type: "title", value: "SÊNIOR" },
    { id: "title_diretor",      name: "Título: DIR. CRIATIVO", desc: "Exibido abaixo do nome do seu AGENTE.",                   price: 200, type: "title", value: "DIRETOR CRIATIVO" },
  ],
  features: [
    { id: "feature_arquivo_filters", name: "Filtros Avançados",  desc: "Filtros extras no ARQUIVO: por estilo, modelo de IA, data.", price: 400, type: "feature" },
    { id: "feature_theme_alt",       name: "Tema Alternativo",   desc: "Interface com contraste invertido — fundo branco.",          price: 250, type: "feature" },
    { id: "feature_pulso_custom",    name: "PULSO Livre",         desc: "Duração customizável para o timer: de 5 a 120 minutos.",     price: 180, type: "feature" },
  ],
};

const ALL_ITEMS = [
  ...SHOP_ITEMS.skins,
  ...SHOP_ITEMS.appearance,
  ...SHOP_ITEMS.features,
];

// ─── Achievements ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: "first_prompt",  label: "Primeiro Prompt",    condition: (s: any) => s.promptsGenerated >= 1 },
  { id: "focus_10",      label: "10 Sessões",          condition: (s: any) => s.pomodoroCompleted >= 10 },
  { id: "focus_50",      label: "50 Sessões",          condition: (s: any) => s.pomodoroCompleted >= 50 },
  { id: "tasks_10",      label: "10 Tarefas",          condition: (s: any) => s.tasksCompleted >= 10 },
  { id: "tasks_50",      label: "50 Tarefas",          condition: (s: any) => s.tasksCompleted >= 50 },
  { id: "streak_3",      label: "Streak ×3",           condition: (s: any) => s.bestStreak >= 3 },
  { id: "streak_7",      label: "Streak ×7",           condition: (s: any) => s.bestStreak >= 7 },
  { id: "rank_forma",    label: "Rank FORMA",          condition: (_: any, xp: number) => xp >= 1500 },
  { id: "rank_autoria",  label: "Rank AUTORIA",        condition: (_: any, xp: number) => xp >= 15000 },
  { id: "images_10",     label: "10 Imagens Geradas",  condition: (s: any) => s.imagesGenerated >= 10 },
  { id: "focus_100h",    label: "100h de Foco",        condition: (s: any) => s.pomodoroTotalMin >= 6000 },
  { id: "prompts_50",    label: "50 Prompts Gerados",  condition: (s: any) => s.promptsGenerated >= 50 },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
let _toastSetter: ((t: { msg: string; type: string; id: number }) => void) | null = null;
function showToast(msg: string, type: "success" | "error" | "info" = "info") {
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

// ─── Section title ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
      letterSpacing: 4,
      color: "#aaa",
      textTransform: "uppercase" as const,
      borderBottom: "1px solid #1a1a1a",
      paddingBottom: 10,
      marginBottom: 24,
    }}>
      {children}
    </div>
  );
}

// ─── CDN URLs (corrigidas) ────────────────────────────────────────────────────
const SKIN_PREVIEW_URLS: Record<string, string> = {
  "base":       "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/base_72592774.png",
  "skin-espada": "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/skin-espada_a1dbf67e.png",
  "skin-mago":   "https://d2xsxph8kpxj0f.cloudfront.net/310519663331012459/4RjPzBcDcvCdjPKo6zdctY/skin-mago_de5ef879.png",
};

const SKIN_LABEL: Record<string, string> = {
  "base": "SAPO BASE",
  "skin-espada": "GUERREIRO",
  "skin-mago": "MAGO",
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Nexus() {
  const {
    nexus, updateNexus, getCurrentRankData, getProgress,
    buyItem, toggleItem, isActive, isPurchased, activeSkin,
  } = useNexus();
  const { navigateTo } = usePageTransition();
  const [shopTab, setShopTab] = useState<"skins" | "appearance" | "features">("skins");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(nexus.agentName);

  const { sapoState, celebrate, handleCelebrateEnd } = useSapoState("idle");

  const rank = getCurrentRankData();
  const pct = getProgress();
  const nextRank = RANKS.find((r) => r.id === rank.id + 1);

  const titleItem = nexus.agentAppearance.titleId
    ? ALL_ITEMS.find((i) => i.id === nexus.agentAppearance.titleId)
    : null;

  const currentSkin: SapoSkin = (activeSkin as SapoSkin) ?? "base";

  const saveName = () => {
    const name = nameInput.trim().toUpperCase() || "AGENTE";
    updateNexus((prev) => ({ ...prev, agentName: name }));
    setEditingName(false);
  };

  const shopBuy = (itemId: string) => {
    const item = ALL_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const ok = buyItem(itemId, item.type, item.price, item.name);
    if (ok) {
      showToast(`${item.name} adquirido — ⬡ ${item.price} glifos. Ative na loja.`, "success");
      celebrate();
    } else if (nexus.glifos < item.price) {
      showToast("Glifos insuficientes", "error");
    }
  };

  const shopToggle = (itemId: string) => {
    const item = ALL_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const wasActive = isActive(itemId);
    toggleItem(itemId, item.type);
    showToast(wasActive ? `${item.name} desativado` : `${item.name} ativado`, "info");
  };

  const s = nexus.stats;
  const focusH = Math.floor(s.pomodoroTotalMin / 60);
  const focusM = s.pomodoroTotalMin % 60;

  return (
    <>
      <GrainOverlay />
      <CustomCursor />
      <GlobalHeader currentPage="nexus" />
      <ToastContainer />

      <div style={{ minHeight: "100vh", background: "#000", color: "#fff" }}>

        {/* ══════════════════════════════════════════════════════
            HERO — SAPO em destaque + identidade do agente
        ══════════════════════════════════════════════════════ */}
        <div style={{
          borderBottom: "1px solid #1a1a1a",
          background: "#000",
        }}>
          <div style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "0 32px",
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 0,
            minHeight: 380,
          }}>

            {/* ── SAPO — coluna esquerda ── */}
            <div className="page-enter-nexus-sapo" style={{
              borderRight: "1px solid #1a1a1a",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingBottom: 0,
              paddingTop: 32,
              position: "relative",
            }}>
              {/* Número do rank como watermark */}
              <span style={{
                position: "absolute",
                top: 24,
                left: 24,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 80,
                color: "#fff",
                opacity: 0.04,
                lineHeight: 1,
                userSelect: "none",
              }}>
                0{rank.id}
              </span>

              <SapoAgent
                skin={currentSkin}
                state={sapoState}
                size={220}
                onCelebrateEnd={handleCelebrateEnd}
              />

              {/* Skin label */}
              <div style={{
                width: "100%",
                borderTop: "1px solid #1a1a1a",
                padding: "10px 0",
                textAlign: "center",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: 4,
                color: "#777",
                textTransform: "uppercase" as const,
              }}>
                {SKIN_LABEL[currentSkin] ?? "SAPO BASE"}
              </div>
            </div>

            {/* ── Info — coluna direita ── */}
            <div style={{
              padding: "40px 0 40px 40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              {/* Topo: label NEXUS + nome editável */}
              <div>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 5,
                  color: "#777",
                  marginBottom: 16,
                  textTransform: "uppercase" as const,
                }}>
                  NEXUS · AGENTE
                </div>

                {/* Nome */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {editingName ? (
                    <>
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onBlur={saveName}
                        onKeyDown={(e) => e.key === "Enter" && saveName()}
                        autoFocus
                        style={{
                          background: "#1a1a1a",
                          border: "1px solid #2a2a2a",
                          color: "#fff",
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: 40,
                          letterSpacing: 4,
                          padding: "4px 12px",
                          outline: "none",
                          width: 280,
                        }}
                      />
                      <button onClick={saveName} style={{ background: "none", border: "none", color: "#999", cursor: "none", fontSize: 14 }}>✓</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, letterSpacing: 4, color: "#fff", lineHeight: 1 }}>
                        {nexus.agentName}
                      </span>
                      <button
                        onClick={() => { setEditingName(true); setNameInput(nexus.agentName); }}
                        style={{ background: "none", border: "none", color: "#777", cursor: "none", fontFamily: "'DM Mono', monospace", fontSize: 13 }}
                      >
                        ✎
                      </button>
                    </>
                  )}
                </div>

                {titleItem && "value" in titleItem && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#999", letterSpacing: 2, marginBottom: 8 }}>
                    {titleItem.value as string}
                  </div>
                )}

                {/* Rank */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 6, color: rank.color, lineHeight: 1 }}>
                    {rank.name}
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#aaa", letterSpacing: 2 }}>
                    Nível 0{rank.id}
                  </span>
                </div>
              </div>

              {/* Meio: XP bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#aaa", letterSpacing: 1, marginBottom: 8 }}>
                  <span>{nexus.xp.toLocaleString()} XP</span>
                  <span>{nextRank ? `próximo: ${nextRank.xpMin.toLocaleString()}` : "rank máximo"}</span>
                </div>
                <div style={{ height: 3, background: "#1a1a1a", width: "100%" }}>
                  <div style={{ height: "100%", background: rank.color, width: `${pct}%`, transition: "width 0.6s ease" }} />
                </div>
              </div>

              {/* Base: Glifos */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'DM Mono', monospace" }}>
                <span style={{ fontSize: 22, color: rank.color }}>⬡</span>
                <span style={{ fontSize: 28, color: "#fff", letterSpacing: 2, lineHeight: 1 }}>{nexus.glifos.toLocaleString()}</span>
                <span style={{ fontSize: 11, color: "#aaa", letterSpacing: 2 }}>GLIFOS</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 32px 120px" }}>

          {/* ── Stats ── */}
          <section style={{ marginBottom: 64 }}>
            <SectionTitle>Estatísticas</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
              {[
                { value: `${focusH}h${focusM > 0 ? focusM + "m" : ""}`, label: "Foco Total" },
                { value: s.pomodoroCompleted, label: "Sessões" },
                { value: s.tasksCompleted, label: "Tarefas" },
                { value: s.promptsGenerated, label: "Prompts" },
                { value: `${s.bestStreak}×`, label: "Melhor Streak" },
                { value: s.imagesGenerated, label: "Imagens" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "#0d0d0d", padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>
                    {stat.value || 0}
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: "#aaa", textTransform: "uppercase" as const }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Activity grid ── */}
          <section style={{ marginBottom: 64 }}>
            <SectionTitle>Atividade — 30 dias</SectionTitle>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const opacity = i < Math.min(s.pomodoroCompleted, 30)
                  ? Math.min(1, 0.2 + (i / 30) * 0.8)
                  : 0.05;
                return (
                  <div
                    key={i}
                    title={`Dia ${30 - i}`}
                    style={{ width: 16, height: 16, background: rank.color, opacity }}
                  />
                );
              })}
            </div>
          </section>

          {/* ── Achievements ── */}
          <section style={{ marginBottom: 64 }}>
            <SectionTitle>Conquistas</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
              {ACHIEVEMENTS.map((a) => {
                const unlocked = a.condition(s, nexus.xp);
                return (
                  <div
                    key={a.id}
                    title={unlocked ? a.label : "Conquista bloqueada"}
                    style={{
                      background: "#0d0d0d",
                      border: `1px solid ${unlocked ? "#2a2a2a" : "#111"}`,
                      padding: "10px 16px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      letterSpacing: 2,
                      color: unlocked ? "#888" : "#2a2a2a",
                      textTransform: "uppercase" as const,
                      filter: unlocked ? "none" : "blur(0.5px)",
                    }}
                  >
                    {unlocked ? a.label : "???"}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Shop ── */}
          <section style={{ marginBottom: 64 }}>
            <SectionTitle>Loja</SectionTitle>

            {/* Glifos display */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#999" }}>
              <span>Saldo:</span>
              <span style={{ color: "#fff" }}>⬡ {nexus.glifos.toLocaleString()}</span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              {(["skins", "appearance", "features"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setShopTab(tab)}
                  style={{
                    background: "none",
                    border: `1px solid ${shopTab === tab ? "#fff" : "#2a2a2a"}`,
                    color: shopTab === tab ? "#fff" : "#555",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 2,
                    padding: "8px 18px",
                    cursor: "none",
                    transition: "all 0.2s",
                    textTransform: "uppercase" as const,
                  }}
                >
                  {tab === "skins" ? "Skins" : tab === "appearance" ? "Aparência" : "Funcionalidades"}
                </button>
              ))}
            </div>

            {/* Equipped panel */}
            {nexus.activeItems.length > 0 && (
              <div style={{ marginBottom: 20, padding: "12px 16px", background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, color: "#aaa", marginBottom: 10, textTransform: "uppercase" as const }}>Equipado agora</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {nexus.activeItems.map((id) => {
                    const item = ALL_ITEMS.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => shopToggle(id)}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#ccc",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 10,
                          letterSpacing: 2,
                          padding: "4px 10px",
                          cursor: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          textTransform: "uppercase" as const,
                        }}
                      >
                        <span style={{ color: "#fff", fontSize: 9 }}>●</span>
                        {item.name}
                        <span style={{ color: "#999", fontSize: 9 }}>✕</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Skins tab ── */}
            {shopTab === "skins" && (
              <div>
                {/* Grid com 3 cards: base + 2 skins — mesmo tamanho */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}>
                  {/* ── Base skin ── */}
                  {(() => {
                    const isBaseActive = !activeSkin;
                    return (
                      <div style={{
                        background: isBaseActive ? "rgba(255,255,255,0.03)" : "#0d0d0d",
                        border: `1px solid ${isBaseActive ? "rgba(255,255,255,0.25)" : "#1a1a1a"}`,
                        display: "flex",
                        flexDirection: "column" as const,
                        position: "relative" as const,
                        overflow: "hidden",
                      }}>
                        {isBaseActive && (
                          <div style={{
                            position: "absolute" as const, top: 8, right: 8,
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 9,
                            letterSpacing: 2,
                            color: "#fff",
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            padding: "3px 7px",
                            zIndex: 2,
                          }}>
                            ATIVO
                          </div>
                        )}

                        {/* Preview — mesmo aspect-ratio 3:4 */}
                        <div style={{
                          width: "100%",
                          aspectRatio: "3 / 4",
                          background: "#080808",
                          borderBottom: "1px solid #1a1a1a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}>
                          <img
                            src={SKIN_PREVIEW_URLS["base"]}
                            alt="SAPO BASE"
                            style={{
                              width: "80%",
                              height: "80%",
                              objectFit: "contain",
                              objectPosition: "bottom center",
                            }}
                          />
                        </div>

                        <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 8, flex: 1 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: isBaseActive ? "#fff" : "#888", textTransform: "uppercase" as const }}>
                            SAPO BASE
                          </span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                            Skin padrão do agente. Sempre disponível, sem equipamento.
                          </span>
                          <div style={{ marginTop: "auto" }}>
                            {isBaseActive ? (
                              <div style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 10,
                                letterSpacing: 2,
                                color: "#999",
                                border: "1px solid #2a2a2a",
                                padding: "8px 0",
                                textAlign: "center",
                              }}>
                                ● EQUIPADO
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (activeSkin) toggleItem(activeSkin, "skin");
                                }}
                                style={{
                                  width: "100%",
                                  background: "none",
                                  border: "1px solid #2a2a2a",
                                  color: "#999",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: 10,
                                  letterSpacing: 2,
                                  padding: "8px 0",
                                  cursor: "none",
                                  textTransform: "uppercase" as const,
                                }}
                              >
                                ○ Usar Base
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Purchasable skins ── */}
                  {SHOP_ITEMS.skins.map((item) => {
                    const owned = isPurchased(item.id);
                    const active = isActive(item.id);
                    const canBuy = nexus.glifos >= item.price && !owned;
                    const borderColor = active ? "rgba(255,255,255,0.35)" : owned ? "#2a2a2a" : "#1a1a1a";
                    const bgColor = active ? "rgba(255,255,255,0.04)" : "#0d0d0d";

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: bgColor,
                          border: `1px solid ${borderColor}`,
                          display: "flex",
                          flexDirection: "column" as const,
                          transition: "border-color 0.2s, background 0.2s",
                          position: "relative" as const,
                          overflow: "hidden",
                        }}
                      >
                        {active && (
                          <div style={{
                            position: "absolute" as const, top: 8, right: 8,
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 9,
                            letterSpacing: 2,
                            color: "#fff",
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            padding: "3px 7px",
                            zIndex: 2,
                          }}>
                            ATIVO
                          </div>
                        )}

                        {/* Preview — mesmo aspect-ratio 3:4 */}
                        <div style={{
                          width: "100%",
                          aspectRatio: "3 / 4",
                          background: "#080808",
                          borderBottom: "1px solid #1a1a1a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          position: "relative" as const,
                        }}>
                          <img
                            src={SKIN_PREVIEW_URLS[item.id]}
                            alt={item.name}
                            style={{
                              width: "80%",
                              height: "80%",
                              objectFit: "contain",
                              objectPosition: "bottom center",
                              filter: !owned ? "grayscale(100%) brightness(0.35)" : "none",
                              transition: "transform 0.3s ease",
                            }}
                          />
                          {!owned && (
                            <div style={{
                              position: "absolute" as const,
                              bottom: 10,
                              left: "50%",
                              transform: "translateX(-50%)",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 11,
                              letterSpacing: 2,
                              color: "#999",
                              background: "rgba(0,0,0,0.7)",
                              padding: "4px 10px",
                              whiteSpace: "nowrap" as const,
                            }}>
                              ⬡ {item.price}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 8, flex: 1 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: active ? "#fff" : owned ? "#888" : "#666", textTransform: "uppercase" as const }}>
                            {item.name}
                          </span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                            {item.desc}
                          </span>

                          <div style={{ marginTop: "auto" }}>
                            {!owned ? (
                              <button
                                onClick={() => shopBuy(item.id)}
                                disabled={!canBuy}
                                style={{
                                  width: "100%",
                                  background: "none",
                                  border: `1px solid ${canBuy ? "#444" : "#1a1a1a"}`,
                                  color: canBuy ? "#888" : "#2a2a2a",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: 10,
                                  letterSpacing: 2,
                                  padding: "8px 0",
                                  cursor: canBuy ? "none" : "not-allowed",
                                  textTransform: "uppercase" as const,
                                  transition: "all 0.2s",
                                }}
                              >
                                {canBuy ? `Comprar  ⬡${item.price}` : "Glifos insuficientes"}
                              </button>
                            ) : (
                              <button
                                onClick={() => shopToggle(item.id)}
                                style={{
                                  width: "100%",
                                  background: active ? "rgba(255,255,255,0.08)" : "none",
                                  border: `1px solid ${active ? "rgba(255,255,255,0.3)" : "#2a2a2a"}`,
                                  color: active ? "#fff" : "#555",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: 10,
                                  letterSpacing: 2,
                                  padding: "8px 0",
                                  cursor: "none",
                                  textTransform: "uppercase" as const,
                                  transition: "all 0.2s",
                                }}
                              >
                                {active ? "● Desativar" : "○ Equipar"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Appearance / Features tabs ── */}
            {shopTab !== "skins" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}>
                {SHOP_ITEMS[shopTab].map((item) => {
                  const owned = isPurchased(item.id);
                  const active = isActive(item.id);
                  const canBuy = nexus.glifos >= item.price && !owned;
                  const borderColor = active ? "rgba(255,255,255,0.35)" : owned ? "#2a2a2a" : "#1a1a1a";
                  const bgColor = active ? "rgba(255,255,255,0.04)" : "#0d0d0d";

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column" as const,
                        gap: 8,
                        transition: "border-color 0.2s, background 0.2s",
                        position: "relative" as const,
                      }}
                    >
                      {active && (
                        <div style={{
                          position: "absolute" as const, top: 10, right: 10,
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "0 0 6px rgba(255,255,255,0.6)",
                        }} />
                      )}

                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: active ? "#fff" : owned ? "#888" : "#666", textTransform: "uppercase" as const }}>
                        {item.name}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                        {item.desc}
                      </span>

                      {!owned && (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: canBuy ? "#666" : "#333", letterSpacing: 1 }}>
                          ⬡ {item.price}
                        </span>
                      )}

                      <div style={{ marginTop: "auto" }}>
                        {!owned ? (
                          <button
                            onClick={() => shopBuy(item.id)}
                            disabled={!canBuy}
                            style={{
                              width: "100%",
                              background: "none",
                              border: `1px solid ${canBuy ? "#444" : "#1a1a1a"}`,
                              color: canBuy ? "#888" : "#2a2a2a",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 10,
                              letterSpacing: 2,
                              padding: "8px 0",
                              cursor: canBuy ? "none" : "not-allowed",
                              textTransform: "uppercase" as const,
                              transition: "all 0.2s",
                            }}
                          >
                            {canBuy ? `Comprar  ⬡${item.price}` : "Glifos insuficientes"}
                          </button>
                        ) : (
                          <button
                            onClick={() => shopToggle(item.id)}
                            style={{
                              width: "100%",
                              background: active ? "rgba(255,255,255,0.08)" : "none",
                              border: `1px solid ${active ? "rgba(255,255,255,0.3)" : "#2a2a2a"}`,
                              color: active ? "#fff" : "#555",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 10,
                              letterSpacing: 2,
                              padding: "8px 0",
                              cursor: "none",
                              textTransform: "uppercase" as const,
                              transition: "all 0.2s",
                            }}
                          >
                            {active ? "● Desativar" : "○ Ativar"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Ranks reference ── */}
          <section>
            <SectionTitle>Tabela de Ranks</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {RANKS.map((r) => {
                const isCurrent = r.id === rank.id;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "14px 16px",
                      background: isCurrent ? "#0d0d0d" : "transparent",
                      border: isCurrent ? `1px solid ${r.color}22` : "1px solid transparent",
                    }}
                  >
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#fff", opacity: 0.15, width: 28 }}>
                      0{r.id}
                    </span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, color: r.color, flex: 1 }}>
                      {r.name}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#aaa", letterSpacing: 1 }}>
                      {r.id === 7 ? `${r.xpMin.toLocaleString()}+ XP` : `${r.xpMin.toLocaleString()} – ${r.xpMax.toLocaleString()} XP`}
                    </span>
                    {isCurrent && (
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: r.color, letterSpacing: 2, border: `1px solid ${r.color}44`, padding: "2px 8px" }}>
                        ATUAL
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
