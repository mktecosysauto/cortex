import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface NexusStats {
  pomodoroCompleted: number;
  pomodoroAbandoned: number;
  pomodoroTotalMin: number;
  tasksCompleted: number;
  promptsGenerated: number;
  promptsEdited: number;
  imagesGenerated: number;
  currentStreak: number;
  bestStreak: number;
  lastSessionDate: string | null;
}

export interface AgentAppearance {
  paletteId: string | null;
  silhouetteId: string | null;
  effectId: string | null;
  titleId: string | null;
}

export interface NexusState {
  agentName: string;
  agentAppearance: AgentAppearance;
  xp: number;
  glifos: number;
  rankId: number;
  stats: NexusStats;
  achievements: string[];
  /** IDs of all purchased items (never removed after purchase) */
  purchases: string[];
  /** IDs of currently active/equipped items (subset of purchases) */
  activeItems: string[];
}

export interface Rank {
  id: number;
  name: string;
  xpMin: number;
  xpMax: number;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const RANKS: Rank[] = [
  { id: 1, name: "RASCUNHO",   xpMin: 0,     xpMax: 499,      color: "var(--nexus-rank-1)" },
  { id: 2, name: "ESBOÇO",     xpMin: 500,   xpMax: 1499,     color: "var(--nexus-rank-2)" },
  { id: 3, name: "FORMA",      xpMin: 1500,  xpMax: 3499,     color: "var(--nexus-rank-3)" },
  { id: 4, name: "TRAÇO",      xpMin: 3500,  xpMax: 7499,     color: "var(--nexus-rank-4)" },
  { id: 5, name: "COMPOSIÇÃO", xpMin: 7500,  xpMax: 14999,    color: "var(--nexus-rank-5)" },
  { id: 6, name: "AUTORIA",    xpMin: 15000, xpMax: 29999,    color: "var(--nexus-rank-6)" },
  { id: 7, name: "CÓRTEX",     xpMin: 30000, xpMax: Infinity, color: "var(--nexus-rank-7)" },
];

export const XP_REWARDS: Record<string, { xp: number; glifos: number }> = {
  pomodoro_25min:      { xp: 15, glifos: 10 },
  pomodoro_50min:      { xp: 35, glifos: 25 },
  pomodoro_abandonado: { xp: 0,  glifos: 0  },
  pomodoro_streak_3:   { xp: 20, glifos: 0  },
  tarefa_facil:        { xp: 5,  glifos: 3  },
  tarefa_media:        { xp: 10, glifos: 7  },
  tarefa_dificil:      { xp: 20, glifos: 15 },
  tarefa_lendaria:     { xp: 40, glifos: 30 },
  primeiro_prompt:     { xp: 25, glifos: 0  },
  prompt_editado:      { xp: 5,  glifos: 0  },
  imagem_gerada:       { xp: 8,  glifos: 0  },
  imagem_salva:        { xp: 5,  glifos: 0  },
};

/** Maps item type to the agentAppearance key it controls */
const ITEM_TYPE_TO_APPEARANCE: Record<string, keyof AgentAppearance> = {
  palette:    "paletteId",
  silhouette: "silhouetteId",
  effect:     "effectId",
  title:      "titleId",
};

/** Exclusive types — only one active at a time */
const EXCLUSIVE_TYPES = new Set(["palette", "silhouette", "effect", "title", "skin"]);

const FOCUS_MULTIPLIER = 1.2;
const NEXUS_KEY = "cortex_nexus_v2";

const DEFAULT_STATE: NexusState = {
  agentName: "AGENTE",
  agentAppearance: { paletteId: null, silhouetteId: null, effectId: null, titleId: null },
  xp: 0,
  glifos: 0,
  rankId: 1,
  stats: {
    pomodoroCompleted: 0,
    pomodoroAbandoned: 0,
    pomodoroTotalMin: 0,
    tasksCompleted: 0,
    promptsGenerated: 0,
    promptsEdited: 0,
    imagesGenerated: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSessionDate: null,
  },
  achievements: [],
  purchases: [],
  activeItems: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getCurrentRank(xp: number): Rank {
  return RANKS.find((r) => xp >= r.xpMin && xp <= r.xpMax) ?? RANKS[0]!;
}

export function getXpProgress(xp: number): number {
  const rank = getCurrentRank(xp);
  if (rank.id === 7) return 100;
  const range = rank.xpMax - rank.xpMin;
  const progress = xp - rank.xpMin;
  return Math.round((progress / range) * 100);
}

export function calcReward(type: string, isFocused = false): { xp: number; glifos: number } {
  const base = XP_REWARDS[type];
  if (!base) return { xp: 0, glifos: 0 };
  const mult = isFocused ? FOCUS_MULTIPLIER : 1;
  return { xp: Math.round(base.xp * mult), glifos: Math.round(base.glifos * mult) };
}

/**
 * Rebuild agentAppearance from the activeItems list.
 * Only one item per type can be active at a time.
 * allItems is the full SHOP_ITEMS flat list passed from the page.
 */
export function buildAppearanceFromActive(
  activeItems: string[],
  allShopItems: { id: string; type: string }[]
): AgentAppearance {
  const appearance: AgentAppearance = { paletteId: null, silhouetteId: null, effectId: null, titleId: null };
  for (const id of activeItems) {
    const item = allShopItems.find((i) => i.id === id);
    if (!item) continue;
    const key = ITEM_TYPE_TO_APPEARANCE[item.type];
    if (key) appearance[key] = id;
  }
  return appearance;
}

export function loadNexusFromStorage(): NexusState {
  try {
    const raw = localStorage.getItem(NEXUS_KEY);
    if (!raw) {
      // Migrate from v1 key if exists
      const v1 = localStorage.getItem("cortex_nexus_v1");
      if (v1) {
        const parsed = JSON.parse(v1);
        const migrated: NexusState = {
          ...DEFAULT_STATE,
          ...parsed,
          stats: { ...DEFAULT_STATE.stats, ...(parsed.stats ?? {}) },
          agentAppearance: { ...DEFAULT_STATE.agentAppearance, ...(parsed.agentAppearance ?? {}) },
          activeItems: parsed.purchases ?? [],
        };
        localStorage.setItem(NEXUS_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return { ...DEFAULT_STATE, stats: { ...DEFAULT_STATE.stats } };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      stats: { ...DEFAULT_STATE.stats, ...(parsed.stats ?? {}) },
      agentAppearance: { ...DEFAULT_STATE.agentAppearance, ...(parsed.agentAppearance ?? {}) },
      purchases: parsed.purchases ?? [],
      activeItems: parsed.activeItems ?? parsed.purchases ?? [],
    };
  } catch {
    return { ...DEFAULT_STATE, stats: { ...DEFAULT_STATE.stats } };
  }
}

function saveNexusToStorage(state: NexusState) {
  localStorage.setItem(NEXUS_KEY, JSON.stringify(state));
}

// ─── Agent SVG ────────────────────────────────────────────────────────────────
export function renderAgentSVG(
  size: "full" | "mini",
  rankColor: string,
  effectId: string | null,
  silhouetteId?: string | null
): string {
  const dim = size === "full" ? 200 : 28;
  const glow = effectId === "effect_glow" ? `filter: drop-shadow(0 0 8px ${rankColor});` : "";
  const isAngular = silhouetteId === "silhouette_angular";

  if (size === "mini") {
    return `<svg width="${dim}" height="${dim}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="${glow}">
      <circle cx="50" cy="38" r="18" fill="${rankColor}" opacity="0.9"/>
      <ellipse cx="50" cy="80" rx="22" ry="14" fill="${rankColor}" opacity="0.7"/>
    </svg>`;
  }

  if (isAngular) {
    return `<svg width="${dim}" height="${dim}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="${glow}">
      <polygon points="50,18 68,32 68,52 50,62 32,52 32,32" fill="${rankColor}" opacity="0.9"/>
      <polygon points="50,68 72,78 72,95 28,95 28,78" fill="${rankColor}" opacity="0.7"/>
      <line x1="50" y1="62" x2="50" y2="68" stroke="${rankColor}" stroke-width="2" opacity="0.5"/>
    </svg>`;
  }

  return `<svg width="${dim}" height="${dim}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="${glow}">
    <circle cx="50" cy="32" r="20" fill="${rankColor}" opacity="0.9"/>
    <ellipse cx="50" cy="75" rx="26" ry="18" fill="${rankColor}" opacity="0.7"/>
    <line x1="50" y1="52" x2="50" y2="57" stroke="${rankColor}" stroke-width="2" opacity="0.5"/>
    <circle cx="43" cy="30" r="3" fill="#000" opacity="0.5"/>
    <circle cx="57" cy="30" r="3" fill="#000" opacity="0.5"/>
  </svg>`;
}

// ─── XP Float Label ───────────────────────────────────────────────────────────
export function showXPGain(xp: number, glifos: number) {
  if (xp === 0 && glifos === 0) return;
  const el = document.createElement("div");
  el.className = "xp-float";
  el.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 32px;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: #fff;
    letter-spacing: 2px;
    pointer-events: none;
    z-index: 9998;
    animation: xpGain 1.2s ease forwards;
  `;
  el.textContent = `+${xp} XP${glifos > 0 ? `  ⬡ +${glifos}` : ""}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface NexusContextValue {
  nexus: NexusState;
  addXP: (type: string, isFocused?: boolean) => void;
  updateNexus: (updater: (prev: NexusState) => NexusState) => void;
  getCurrentRankData: () => Rank;
  getProgress: () => number;
  syncWithDB: () => void;
  /**
   * Buy an item from the shop. Deducts glifos, adds to purchases.
   * Does NOT activate the item automatically.
   */
  buyItem: (itemId: string, itemType: string, itemPrice: number, itemName: string) => boolean;
  /**
   * Toggle an item on/off. Item must be in purchases.
   * For appearance types (palette/silhouette/effect/title/skin) only one per type can be active.
   * For feature type multiple can be active simultaneously.
   */
  toggleItem: (itemId: string, itemType: string) => void;
  /** Whether an item is currently active */
  isActive: (itemId: string) => boolean;
  /** Whether an item has been purchased */
  isPurchased: (itemId: string) => boolean;
  /**
   * Returns the active skin ID ("skin-espada", "skin-mago") or null for base.
   * Derived from activeItems where item type is 'skin'.
   */
  activeSkin: string | null;
}

const NexusContext = createContext<NexusContextValue | null>(null);

export function NexusProvider({ children }: { children: ReactNode }) {
  const [nexus, setNexus] = useState<NexusState>(() => loadNexusFromStorage());
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tRPC hooks for DB sync
  const profileQuery = trpc.cortex.nexus.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const updateProfileMut = trpc.cortex.nexus.updateProfile.useMutation();

  // Load from DB when profile arrives (overrides localStorage)
  useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data;
      setNexus((prev) => {
        const dbPurchases = (p.purchases as string[] | null) ?? prev.purchases;
        // activeItems stored in agentAppearance JSON in DB — extract from it
        const dbAppearance = (p.agentAppearance as AgentAppearance | null) ?? prev.agentAppearance;
        // Reconstruct activeItems from stored appearance (backwards compat)
        const dbActiveItems: string[] = [];
        if (dbAppearance.paletteId)    dbActiveItems.push(dbAppearance.paletteId);
        if (dbAppearance.silhouetteId) dbActiveItems.push(dbAppearance.silhouetteId);
        if (dbAppearance.effectId)     dbActiveItems.push(dbAppearance.effectId);
        if (dbAppearance.titleId)      dbActiveItems.push(dbAppearance.titleId);

        const merged: NexusState = {
          ...prev,
          agentName: p.agentName ?? prev.agentName,
          agentAppearance: dbAppearance,
          xp: p.xp ?? prev.xp,
          glifos: p.glifos ?? prev.glifos,
          rankId: p.rankId ?? prev.rankId,
          purchases: dbPurchases,
          activeItems: dbActiveItems.length > 0 ? dbActiveItems : prev.activeItems,
        };
        saveNexusToStorage(merged);
        return merged;
      });
    }
  }, [profileQuery.data]);

  // Debounced DB sync — persists agentAppearance which encodes activeItems
  const syncWithDB = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      setNexus((current) => {
        updateProfileMut.mutate({
          agentName: current.agentName,
          agentAppearance: current.agentAppearance,
          xp: current.xp,
          glifos: current.glifos,
          rankId: current.rankId,
          purchases: current.purchases,
        });
        return current;
      });
    }, 1500);
  }, [updateProfileMut]);

  const updateNexus = useCallback((updater: (prev: NexusState) => NexusState) => {
    setNexus((prev) => {
      const next = updater(prev);
      saveNexusToStorage(next);
      return next;
    });
    syncWithDB();
  }, [syncWithDB]);

  // ── Buy item ──────────────────────────────────────────────────────────────
  const buyItem = useCallback((itemId: string, _itemType: string, itemPrice: number, itemName: string): boolean => {
    let success = false;
    setNexus((prev) => {
      if (prev.purchases.includes(itemId) || prev.glifos < itemPrice) return prev;
      success = true;
      const next: NexusState = {
        ...prev,
        glifos: prev.glifos - itemPrice,
        purchases: [...prev.purchases, itemId],
        // Do NOT activate automatically — user must toggle
      };
      saveNexusToStorage(next);
      return next;
    });
    if (success) {
      // Sync after purchase
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        setNexus((current) => {
          updateProfileMut.mutate({
            glifos: current.glifos,
            purchases: current.purchases,
          });
          return current;
        });
      }, 1000);
    }
    return success;
  }, [updateProfileMut]);

  // ── Toggle item ───────────────────────────────────────────────────────────
  const toggleItem = useCallback((itemId: string, itemType: string) => {
    setNexus((prev) => {
      if (!prev.purchases.includes(itemId)) return prev;

      const isCurrentlyActive = prev.activeItems.includes(itemId);
      let newActiveItems: string[];

      if (isCurrentlyActive) {
        // Deactivate
        newActiveItems = prev.activeItems.filter((id) => id !== itemId);
      } else {
        // Activate — for exclusive types, deactivate any other item of the same type first
        if (EXCLUSIVE_TYPES.has(itemType)) {
          // Remove any other active item of the same type
          // Skin IDs follow pattern: skin-* (hyphen), others: type_* (underscore)
          newActiveItems = prev.activeItems.filter((id) => {
            const activeType = itemType === "skin"
              ? (id.startsWith("skin-") ? "skin" : id.split("_")[0])
              : id.split("_")[0];
            return activeType !== itemType;
          });
          newActiveItems.push(itemId);
        } else {
          // Features can stack
          newActiveItems = [...prev.activeItems, itemId];
        }
      }

      // Rebuild agentAppearance from newActiveItems
      const newAppearance: AgentAppearance = { paletteId: null, silhouetteId: null, effectId: null, titleId: null };
      for (const id of newActiveItems) {
        const type = id.split("_")[0];
        const key = ITEM_TYPE_TO_APPEARANCE[type ?? ""];
        if (key) newAppearance[key] = id;
      }

      const next: NexusState = {
        ...prev,
        activeItems: newActiveItems,
        agentAppearance: newAppearance,
      };
      saveNexusToStorage(next);
      return next;
    });
    syncWithDB();
  }, [syncWithDB]);

  const isActive = useCallback((itemId: string) => nexus.activeItems.includes(itemId), [nexus.activeItems]);
  const isPurchased = useCallback((itemId: string) => nexus.purchases.includes(itemId), [nexus.purchases]);

  // Derive activeSkin from activeItems
  const activeSkin = nexus.activeItems.find((id) => id.startsWith("skin-")) ?? null;

  const addXP = useCallback((type: string, isFocused = false) => {
    setNexus((prev) => {
      const reward = calcReward(type, isFocused);
      if (reward.xp === 0 && reward.glifos === 0) return prev;

      const prevRank = getCurrentRank(prev.xp);
      const newXp = prev.xp + reward.xp;
      const newGlifos = prev.glifos + reward.glifos;
      const newRank = getCurrentRank(newXp);

      showXPGain(reward.xp, reward.glifos);

      if (newRank.id > prevRank.id) {
        setTimeout(() => {
          const el = document.createElement("div");
          el.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
            background: rgba(0,0,0,0.95); border: 1px solid #fff;
            padding: 32px 48px; z-index: 9999; text-align: center;
            font-family: 'Bebas Neue', sans-serif; animation: fadeUp 0.4s ease;
          `;
          el.innerHTML = `
            <div style="font-size:11px;letter-spacing:4px;color:#666;margin-bottom:8px;font-family:'DM Mono',monospace">RANK UP</div>
            <div style="font-size:42px;letter-spacing:6px;color:${newRank.color}">${newRank.name}</div>
          `;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 3000);
        }, 100);
      }

      const next: NexusState = { ...prev, xp: newXp, glifos: newGlifos, rankId: newRank.id };
      saveNexusToStorage(next);
      return next;
    });
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      setNexus((current) => {
        updateProfileMut.mutate({ xp: current.xp, glifos: current.glifos, rankId: current.rankId });
        return current;
      });
    }, 3000);
  }, [updateProfileMut]);

  const getCurrentRankData = useCallback(() => getCurrentRank(nexus.xp), [nexus.xp]);
  const getProgress = useCallback(() => getXpProgress(nexus.xp), [nexus.xp]);

  // Sync from storage on focus (other tabs)
  useEffect(() => {
    const onFocus = () => setNexus(loadNexusFromStorage());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <NexusContext.Provider value={{
      nexus, addXP, updateNexus, getCurrentRankData, getProgress, syncWithDB,
      buyItem, toggleItem, isActive, isPurchased, activeSkin,
    }}>
      {children}
    </NexusContext.Provider>
  );
}

export function useNexus() {
  const ctx = useContext(NexusContext);
  if (!ctx) throw new Error("useNexus must be used within NexusProvider");
  return ctx;
}
