/**
 * AchievementToast — Toast especial de conquista desbloqueada
 *
 * Exibe o SAPO em miniatura (sapoCelebra), ícone da conquista,
 * nome em Bebas Neue e descrição. Auto-dismiss em 5s.
 *
 * Uso:
 *   import { showAchievementToast } from "@/components/AchievementToast";
 *   showAchievementToast({ icon: "◈", name: "CENTURIÃO", desc: "100 prompts gerados" });
 */

import { useEffect, useState, useCallback } from "react";
import SapoAgent from "@/components/SapoAgent";

interface AchievementData {
  icon: string;
  name: string;
  desc: string;
  color?: string;
}

// ── Global singleton ──────────────────────────────────────────────────────────
let _showFn: ((data: AchievementData) => void) | null = null;

export function showAchievementToast(data: AchievementData) {
  _showFn?.(data);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AchievementToastContainer() {
  const [queue, setQueue] = useState<(AchievementData & { id: number })[]>([]);
  const [visible, setVisible] = useState<(AchievementData & { id: number }) | null>(null);
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(null);
      setExiting(false);
      setQueue(prev => prev.slice(1));
    }, 400);
  }, []);

  // Register global handler
  useEffect(() => {
    _showFn = (data) => {
      setQueue(prev => [...prev, { ...data, id: Date.now() }]);
    };
    return () => { _showFn = null; };
  }, []);

  // Show next in queue
  useEffect(() => {
    if (!visible && queue.length > 0) {
      setVisible(queue[0]!);
    }
  }, [queue, visible]);

  // Auto-dismiss
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  if (!visible) return null;

  const color = visible.color ?? "#fff";

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#080808",
        border: `1px solid ${color}44`,
        padding: "16px 20px",
        cursor: "none",
        maxWidth: 340,
        animation: exiting
          ? "achieveOut 0.4s cubic-bezier(0.4,0,1,1) both"
          : "achieveIn 0.5s cubic-bezier(0.16,1,0.3,1) both",
        boxShadow: `0 0 40px ${color}10`,
      }}
    >
      {/* SAPO miniatura em celebrate */}
      <div style={{ flexShrink: 0 }}>
        <SapoAgent skin="base" state="celebrate" size={56} />
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label */}
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 8,
          letterSpacing: 3,
          color: "#aaa",
          textTransform: "uppercase",
          marginBottom: 4,
        }}>
          Conquista desbloqueada
        </div>

        {/* Nome + ícone */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color, fontSize: 14, lineHeight: 1 }}>{visible.icon}</span>
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            letterSpacing: 4,
            color: "#fff",
            lineHeight: 1,
          }}>
            {visible.name}
          </span>
        </div>

        {/* Descrição */}
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: 1,
          color: "#999",
          lineHeight: 1.4,
        }}>
          {visible.desc}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 1,
        background: color,
        animation: "achieveProgress 5s linear both",
        width: "100%",
        transformOrigin: "left",
      }} />
    </div>
  );
}
