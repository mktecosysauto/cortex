import { useEffect, useRef, useState, useCallback } from "react";
import { GrainOverlay } from "@/components/CortexShell";
import { GlobalHeader } from "@/components/GlobalHeader";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { trpc } from "@/lib/trpc";
import NexusBadge from "@/components/NexusBadge";
import { useNexus } from "@/contexts/NexusContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useRoute } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PromptItem {
  id: number;
  vehicle: string;
  tags: string[];
  prompt: string;
  imgData?: string | null;
  isUser?: boolean;
}

// DB prompt adapted to PromptItem shape
function dbToPromptItem(p: {
  id: number;
  title: string;
  tags: string[] | null;
  prompt: string;
  imgUrl: string | null;
  isSystem: boolean;
}): PromptItem {
  return {
    id: p.id,
    vehicle: p.title,
    tags: p.tags ?? [],
    prompt: p.prompt,
    imgData: p.imgUrl ?? null,
    isUser: !p.isSystem,
  };
}

// ─── API Key helpers (localStorage) ──────────────────────────────────────────
const LS_FP = "apg_fp_key";
const LS_ANTH = "apg_anth_key";
function getFpKey() { return localStorage.getItem(LS_FP) || ""; }
function getAnthKey() { return localStorage.getItem(LS_ANTH) || ""; }

// ─── Polling helper ───────────────────────────────────────────────────────────
async function fpPoll(taskUrl: string, fpKey: string, maxMs = 120000): Promise<{ images?: { url: string }[]; url?: string; video_url?: string; prompt?: string; data?: { prompt?: string } }> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(taskUrl, { headers: { "x-freepik-api-key": fpKey } });
    const data = await res.json();
    const status = data.data?.status || data.status;
    if (status === "DONE" || status === "completed") return data.data || data;
    if (status === "FAILED" || status === "failed") throw new Error("Task failed");
  }
  throw new Error("Timeout");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let _toastFn: ((msg: string, type?: string) => void) | null = null;
function showToast(msg: string, type: "success" | "error" | "info" = "info") {
  _toastFn?.(msg, type);
}
function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
  useEffect(() => {
    _toastFn = (msg, type = "info") => {
      const id = Date.now();
      setToasts((p) => [...p, { id, msg, type }]);
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
    };
    return () => { _toastFn = null; };
  }, []);
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── ThinkingDots ─────────────────────────────────────────────────────────────
function ThinkingDots({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      {label && (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", marginLeft: 4 }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const [fpKey, setFpKey] = useState(getFpKey());
  const [anthKey, setAnthKey] = useState(getAnthKey());
  const save = () => {
    localStorage.setItem(LS_FP, fpKey.trim());
    localStorage.setItem(LS_ANTH, anthKey.trim());
    showToast("Configurações salvas", "success");
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#fff" }}>
            ⚙ CONFIGURAÇÕES DE API
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#999", fontSize: 18, cursor: "none" }}>✕</button>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", letterSpacing: 1, display: "block", marginBottom: 8, textTransform: "uppercase" }}>
            Freepik API Key
          </label>
          <input
            type="password"
            className="input-cortex"
            value={fpKey}
            onChange={(e) => setFpKey(e.target.value)}
            placeholder="fp_xxxxxxxxxxxxxxxxxxxx"
          />
          <div style={{ marginTop: 6, fontFamily: "'DM Mono', monospace", fontSize: 9, color: fpKey ? "#44ff88" : "#666" }}>
            {fpKey ? "● Configurada" : "○ Vazia"}
          </div>
        </div>
        <div style={{ marginBottom: 32 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", letterSpacing: 1, display: "block", marginBottom: 8, textTransform: "uppercase" }}>
            Anthropic API Key <span style={{ color: "#aaa" }}>(opcional)</span>
          </label>
          <input
            type="password"
            className="input-cortex"
            value={anthKey}
            onChange={(e) => setAnthKey(e.target.value)}
            placeholder="sk-ant-xxxxxxxxxxxxxxxxxxxx"
          />
          <div style={{ marginTop: 6, fontFamily: "'DM Mono', monospace", fontSize: 9, color: anthKey ? "#44ff88" : "#666" }}>
            {anthKey ? "● Configurada" : "○ Vazia"}
          </div>
        </div>
        <button className="btn-cortex" style={{ width: "100%", justifyContent: "center" }} onClick={save}>
          Salvar
        </button>
      </div>
    </div>
  );
}

// ─── Upload Modal (adapted for DB) ───────────────────────────────────────────
interface UploadModalProps {
  onClose: () => void;
  onSave: (data: { title: string; tags: string[]; prompt: string; imgUrl?: string }) => Promise<void>;
}
function UploadModal({ onClose, onSave }: UploadModalProps) {
  const [imgData, setImgData] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reverseEngineerMut = trpc.arquivo.reverseEngineer.useMutation();

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setImgData(data);
      setTimeout(() => autoGeneratePrompt(data), 100);
    };
    reader.readAsDataURL(file);
  };

  const autoGeneratePrompt = async (imageData: string) => {
    setLoading(true);
    try {
      const base64 = imageData.split(",")[1];
      const mediaType = imageData.split(";")[0].split(":")[1] || "image/jpeg";
      const data = await reverseEngineerMut.mutateAsync({ imageBase64: base64, mediaType });
      if (typeof data.text === "string" && data.text) {
        setPrompt(data.text);
        showToast("Prompt gerado automaticamente", "success");
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const generatePrompt = async () => {
    if (!imgData) { showToast("Adicione uma imagem primeiro", "error"); return; }
    setLoading(true);
    try {
      const base64 = imgData.split(",")[1];
      const mediaType = imgData.split(";")[0].split(":")[1] || "image/jpeg";
      const data = await reverseEngineerMut.mutateAsync({ imageBase64: base64, mediaType });
      setPrompt(typeof data.text === "string" ? data.text : "");
      showToast("Prompt gerado com sucesso", "success");
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vehicle.trim()) { showToast("Informe o nome do veículo", "error"); return; }
    if (!prompt.trim()) { showToast("Gere ou escreva um prompt", "error"); return; }
    setSaving(true);
    try {
      await onSave({
        title: vehicle.toUpperCase(),
        tags: [],
        prompt,
        imgUrl: imgData ?? undefined,
      });
      showToast("Referência salva na galeria", "success");
      onClose();
    } catch (err: unknown) {
      showToast(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box panel-scroll" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#fff" }}>
            ADICIONAR REFERÊNCIA
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#999", fontSize: 18, cursor: "none" }}>✕</button>
        </div>
        {!imgData ? (
          <div
            className={`drop-zone${dragOver ? " drag-over" : ""}`}
            style={{ marginBottom: 20 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.1)", marginBottom: 8 }}>↑</div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#999" }}>
              Arraste uma imagem ou clique para selecionar
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: 20, position: "relative" }}>
            <img src={imgData} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} alt="preview" />
            <button
              onClick={() => setImgData(null)}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.8)", border: "1px solid #2a2a2a", color: "#fff", width: 28, height: 28, cursor: "none", fontSize: 12 }}
            >✕</button>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <input
            className="input-cortex"
            placeholder="Nome do veículo / assunto"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
          />
        </div>
        {loading && (
          <div style={{ marginBottom: 16, padding: "12px 0", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
            <ThinkingDots label="Analisando imagem e gerando prompt..." />
          </div>
        )}
        {!loading && (
          <button className="btn-cortex" style={{ width: "100%", justifyContent: "center", marginBottom: 16 }} onClick={generatePrompt} disabled={loading}>
            → {prompt ? "Regerar Prompt" : "Gerar Prompt com IA"}
          </button>
        )}
        {prompt && (
          <>
            <textarea
              className="textarea-cortex"
              style={{ minHeight: 120, marginBottom: 12 }}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button className="btn-cortex sm ghost" onClick={() => { navigator.clipboard.writeText(prompt); showToast("Prompt copiado", "success"); }}>
                Copiar Prompt
              </button>
              <button className="btn-cortex sm" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave} disabled={saving}>
                {saving ? <ThinkingDots label="Salvando..." /> : "+ Salvar na Galeria"}
              </button>
            </div>
          </>
        )}
        {!prompt && (
          <button className="btn-cortex sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={handleSave} disabled={saving}>
            {saving ? <ThinkingDots label="Salvando..." /> : "+ Salvar na Galeria"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Freepik Panel ────────────────────────────────────────────────────────────
type FpPanelType = "improve" | "generate" | "upscale" | "animate" | null;
interface FreepikPanelProps {
  type: FpPanelType;
  prompt: string;
  imgData?: string | null;
  onUseImage?: (url: string) => void;
}
function FreepikPanel({ type, prompt, imgData, onUseImage }: FreepikPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const improvePromptMut = trpc.freepik.improvePrompt.useMutation();
  const generateImageMut = trpc.freepik.generateImage.useMutation();
  const upscaleImageMut = trpc.freepik.upscaleImage.useMutation();
  const animateImageMut = trpc.freepik.animateImage.useMutation();
  const run = async () => {
    const key = getFpKey();
    if (!key) { showToast("Configure a Freepik API Key nas configurações", "error"); return; }
    setLoading(true);
    setResult(null);
    try {
      if (type === "improve") {
        setStatusMsg("Melhorando prompt via servidor...");
        const data = await improvePromptMut.mutateAsync({ apiKey: key, prompt });
        const improved = (data as { prompt?: string; data?: { prompt?: string } }).prompt
          || (data as { data?: { prompt?: string } }).data?.prompt || "";
        setResult(improved);
        showToast("Prompt melhorado!", "success");
      } else if (type === "generate") {
        setStatusMsg("Gerando imagem (pode levar 30-60s)...");
        const data = await generateImageMut.mutateAsync({ apiKey: key, prompt, aspectRatio: "3:4", realism: true });
        const imgUrl = (data as { images?: { url: string }[]; url?: string }).images?.[0]?.url
          || (data as { url?: string }).url || "";
        setResult(imgUrl);
        showToast("Imagem gerada!", "success");
      } else if (type === "upscale") {
        if (!imgData) { showToast("Sem imagem para upscale", "error"); setLoading(false); return; }
        setStatusMsg("Fazendo upscale via servidor...");
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
        const data = await upscaleImageMut.mutateAsync({ apiKey: key, imageBase64: base64 });
        setResult((data as { images?: { url: string }[]; url?: string }).images?.[0]?.url
          || (data as { url?: string }).url || "");
        showToast("Upscale concluído!", "success");
      } else if (type === "animate") {
        if (!imgData) { showToast("Sem imagem para animar", "error"); setLoading(false); return; }
        setStatusMsg("Gerando vídeo (pode levar até 4 min)...");
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
        const data = await animateImageMut.mutateAsync({ apiKey: key, imageBase64: base64, prompt, duration: 5, aspectRatio: "3:4" });
        setResult((data as { video_url?: string; url?: string }).video_url
          || (data as { url?: string }).url || "");
        showToast("Vídeo gerado!", "success");
      }
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };
  const labels: Record<NonNullable<FpPanelType>, string> = {
    improve: "⚡ Melhorar Prompt",
    generate: "🎨 Gerar Imagem",
    upscale: "✨ Upscale",
    animate: "▶ Animar",
  };
  if (!type) return null;
  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid #2a2a2a" }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#999", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
        {labels[type]}
      </div>
      {!result && !loading && (
        <button className="btn-cortex sm" style={{ width: "100%", justifyContent: "center" }} onClick={run}>
          → Executar
        </button>
      )}
      {loading && <ThinkingDots label={statusMsg} />}
      {result && !loading && (
        <div>
          {type === "improve" && (
            <>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", lineHeight: 1.6, marginBottom: 10 }}>{result}</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-cortex sm ghost" onClick={() => { navigator.clipboard.writeText(result); showToast("Copiado!", "success"); }}>Copiar</button>
                <button className="btn-cortex sm ghost" onClick={() => setResult(null)}>Tentar novamente</button>
              </div>
            </>
          )}
          {(type === "generate" || type === "upscale") && (
            <>
              <img src={result} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block", marginBottom: 8 }} alt="resultado" />
              <div style={{ display: "flex", gap: 6 }}>
                {type === "generate" && onUseImage && (
                  <button className="btn-cortex sm" onClick={() => onUseImage(result)}>Usar como capa</button>
                )}
                <a href={result} download style={{ textDecoration: "none" }}>
                  <button className="btn-cortex sm ghost">Download</button>
                </a>
              </div>
            </>
          )}
          {type === "animate" && (
            <>
              <video src={result} controls style={{ width: "100%", display: "block", marginBottom: 8 }} />
              <a href={result} download style={{ textDecoration: "none" }}>
                <button className="btn-cortex sm ghost">Download .mp4</button>
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Prompt Card ──────────────────────────────────────────────────────────────
interface CardProps {
  item: PromptItem;
  index: number;
  onDelete?: (id: number) => void;
  onUpdateImg?: (id: number, url: string) => void;
}
function PromptCard({ item, index, onDelete, onUpdateImg }: CardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [editPrompt, setEditPrompt] = useState(item.prompt);
  const [editRequest, setEditRequest] = useState("");
  const [editResult, setEditResult] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [activeFpPanel, setActiveFpPanel] = useState<FpPanelType>(null);
  const [cardImg, setCardImg] = useState<string | null>(item.imgData || null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.style.opacity = "1"; },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const toggleEdit = () => {
    setEditOpen((p) => !p);
    setActiveFpPanel(null);
  };
  const toggleFp = (panel: FpPanelType) => {
    setActiveFpPanel((p) => (p === panel ? null : panel));
    setEditOpen(false);
  };

  const editPromptMut = trpc.arquivo.editPrompt.useMutation();
  const generatePrompt = async () => {
    if (!editRequest.trim()) { showToast("Descreva o que você quer mudar", "error"); return; }
    setEditLoading(true);
    try {
      const data = await editPromptMut.mutateAsync({ prompt: editPrompt, request: editRequest });
      setEditResult(typeof data.text === "string" ? data.text : "");
      showToast("Prompt atualizado!", "success");
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleUseImage = (url: string) => {
    setCardImg(url);
    onUpdateImg?.(item.id, url);
    showToast("Imagem do card atualizada", "success");
  };

  const handleDelete = () => {
    const el = cardRef.current;
    if (el) {
      el.style.transform = "scale(0.95)";
      el.style.opacity = "0";
      el.style.transition = "all 0.25s ease";
      setTimeout(() => onDelete?.(item.id), 250);
    }
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: "#0d0d0d",
        border: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        animation: `fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) ${Math.min(index * 0.06, 0.6)}s both`,
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.6)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", background: "#1a1a1a" }}>
        {cardImg ? (
          <img
            src={cardImg}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
            alt={item.vehicle}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "rgba(255,255,255,0.06)", letterSpacing: 4 }}>
              {item.id.toString().padStart(2, "0")}
            </span>
          </div>
        )}
        <div style={{ position: "absolute", top: 8, left: 8, fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#999", background: "rgba(0,0,0,0.7)", padding: "2px 6px", letterSpacing: 1 }}>
          {item.id.toString().padStart(2, "0")}
        </div>
        {item.isUser && (
          <button
            onClick={handleDelete}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.8)", border: "1px solid #2a2a2a", color: "#999", width: 24, height: 24, cursor: "none", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        )}
      </div>
      {/* Vehicle name */}
      <div style={{ padding: "12px 14px 8px", borderTop: "1px solid #2a2a2a" }}>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>
          {item.vehicle}
        </h3>
      </div>
      {/* Tags */}
      {item.tags.length > 0 && (
        <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 4 }}>
          {item.tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      )}
      {/* Prompt preview */}
      <div style={{ padding: "0 14px 10px" }}>
        <div className={`prompt-preview${promptExpanded ? " expanded" : ""}`}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", lineHeight: 1.6 }}>
            {item.prompt}
          </p>
        </div>
      </div>
      {/* Action buttons */}
      <div style={{ padding: "0 14px 10px", display: "flex", gap: 8 }}>
        <button className="btn-cortex sm ghost" style={{ flex: 1, justifyContent: "center" }} onClick={toggleEdit}>
          ✦ Editar
        </button>
        <button className="btn-cortex sm ghost" onClick={() => setPromptExpanded((p) => !p)}>
          {promptExpanded ? "Menos" : "Ver tudo"}
        </button>
      </div>
      {/* Edit Panel */}
      <div className={`collapse-panel${editOpen ? " open" : ""}`}>
        <div style={{ padding: "12px 14px", borderTop: "1px solid #2a2a2a" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#999", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
            Editar Prompt
          </div>
          <textarea className="textarea-cortex" style={{ minHeight: 80, marginBottom: 8 }} value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
          <input className="input-cortex" style={{ marginBottom: 8 }} placeholder="O que você quer mudar?" value={editRequest} onChange={(e) => setEditRequest(e.target.value)} />
          <button className="btn-cortex sm" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={generatePrompt} disabled={editLoading}>
            {editLoading ? <ThinkingDots label="Gerando..." /> : "→ Gerar Prompt Atualizado"}
          </button>
          {editResult && (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#999", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Resultado</div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", lineHeight: 1.6, marginBottom: 8 }}>{editResult}</p>
              <button className="btn-cortex sm ghost" onClick={() => { navigator.clipboard.writeText(editResult); showToast("Copiado!", "success"); }}>
                Copiar Resultado
              </button>
            </>
          )}
        </div>
      </div>
      {/* Freepik Bar */}
      <div className="fp-bar" style={{ borderTop: "1px solid #2a2a2a" }}>
        {(["improve", "generate", "upscale", "animate"] as FpPanelType[]).map((panel) => {
          const icons: Record<NonNullable<FpPanelType>, string> = { improve: "⚡", generate: "🎨", upscale: "✨", animate: "▶" };
          const labels: Record<NonNullable<FpPanelType>, string> = { improve: "Melhorar", generate: "Gerar", upscale: "Upscale", animate: "Animar" };
          return (
            <button
              key={panel}
              className="fp-bar-btn"
              style={{ color: activeFpPanel === panel ? "#fff" : undefined, background: activeFpPanel === panel ? "#1a1a1a" : undefined }}
              onClick={() => toggleFp(panel)}
            >
              {icons[panel!]} {labels[panel!]}
            </button>
          );
        })}
      </div>
      {/* Freepik Panels */}
      <div className={`collapse-panel${activeFpPanel ? " open" : ""}`}>
        {activeFpPanel && (
          <FreepikPanel
            type={activeFpPanel}
            prompt={editResult || editPrompt || item.prompt}
            imgData={cardImg}
            onUseImage={handleUseImage}
          />
        )}
      </div>
    </div>
  );
}

// ─── Create Collection Modal ──────────────────────────────────────────────────
interface CreateCollectionModalProps {
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
}
function CreateCollectionModal({ onClose, onCreate }: CreateCollectionModalProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { showToast("Informe o nome da coleção", "error"); return; }
    setSaving(true);
    try {
      await onCreate(name.toUpperCase().trim(), desc.trim() || undefined);
      showToast("Coleção criada", "success");
      onClose();
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#fff" }}>
            NOVA COLEÇÃO
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#999", fontSize: 18, cursor: "none" }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", letterSpacing: 1, display: "block", marginBottom: 8, textTransform: "uppercase" }}>
            Nome da Coleção
          </label>
          <input
            className="input-cortex"
            placeholder="Ex: URBANOS, MOTOS, CLÁSSICOS"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <div style={{ marginBottom: 32 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", letterSpacing: 1, display: "block", marginBottom: 8, textTransform: "uppercase" }}>
            Descrição <span style={{ color: "#555" }}>(opcional)</span>
          </label>
          <textarea
            className="textarea-cortex"
            style={{ minHeight: 60 }}
            placeholder="Descreva o tema desta coleção..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <button className="btn-cortex" style={{ width: "100%", justifyContent: "center" }} onClick={handleCreate} disabled={saving}>
          {saving ? <ThinkingDots label="Criando..." /> : "+ Criar Coleção"}
        </button>
      </div>
    </div>
  );
}

// ─── Library Screen (tela de coleções) ───────────────────────────────────────
function LibraryScreen() {
  const { navigateTo } = usePageTransition();
  const { user, isAuthenticated, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();

  const { data: collections = [], isLoading } = trpc.arquivo.getCollections.useQuery();
  const createCollectionMut = trpc.arquivo.createCollection.useMutation({
    onSuccess: () => utils.arquivo.getCollections.invalidate(),
  });
  const deleteCollectionMut = trpc.arquivo.deleteCollection.useMutation({
    onSuccess: () => utils.arquivo.getCollections.invalidate(),
  });

  const handleCreate = async (name: string, description?: string) => {
    await createCollectionMut.mutateAsync({ name, description });
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deletar esta coleção e todos os seus prompts?")) return;
    await deleteCollectionMut.mutateAsync({ id });
    showToast("Coleção removida", "success");
  };

  return (
    <>
      <GrainOverlay />
      <GlobalHeader currentPage="arquivo" />
      <ToastContainer />

      {/* Header */}
      <header style={{ position: "sticky", top: 56, zIndex: 100, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)", borderBottom: "1px solid #2a2a2a", padding: "0 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <button
              style={{ background: "none", border: "none", color: "#999", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, cursor: "none", display: "flex", alignItems: "center", gap: 6 }}
              data-hover
              onClick={() => navigateTo("/")}
            >
              ← CÓRTEX
            </button>
            <div style={{ width: 1, height: 20, background: "#2a2a2a" }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>
                ARQUIVO
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#aaa", letterSpacing: 1 }}>
                biblioteca · {collections.length} {collections.length === 1 ? "coleção" : "coleções"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NexusBadge />
            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <button className="btn-cortex sm ghost" onClick={() => window.location.href = "/admin"} data-hover>ADMIN</button>
                )}
                <button className="btn-cortex sm ghost" onClick={() => logout()} data-hover>SAIR</button>
              </>
            ) : (
              <a href={getLoginUrl()} className="btn-cortex sm" style={{ textDecoration: "none" }} data-hover>ENTRAR</a>
            )}
            <button className="btn-cortex sm" onClick={() => setShowCreate(true)} data-hover>+ Coleção</button>
            <button className="btn-cortex sm ghost" onClick={() => setShowSettings(true)} data-hover>⚙</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ background: "#000", minHeight: "100vh", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#555", letterSpacing: 1 }}>
              SELECIONE UMA COLEÇÃO PARA VER OS PROMPTS
            </p>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "40px 0" }}>
              <ThinkingDots label="Carregando coleções..." />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
              {collections.map((col, i) => (
                <div
                  key={col.id}
                  data-hover
                  onClick={() => navigateTo(`/arquivo/${col.id}`)}
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid #2a2a2a",
                    padding: "32px 28px",
                    cursor: "none",
                    transition: "border-color 0.3s ease, background 0.3s ease",
                    animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
                    position: "relative",
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "#111"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#0d0d0d"; }}
                >
                  {/* System badge */}
                  {col.isSystem && (
                    <div style={{ position: "absolute", top: 12, right: 12, fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#555", letterSpacing: 1, border: "1px solid #2a2a2a", padding: "2px 6px" }}>
                      SISTEMA
                    </div>
                  )}
                  {/* Delete button (non-system) */}
                  {!col.isSystem && (
                    <button
                      onClick={(e) => handleDelete(col.id, e)}
                      style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#444", fontSize: 14, cursor: "none", padding: 4 }}
                      data-hover
                    >✕</button>
                  )}

                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#555", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
                      {String(i + 1).padStart(2, "0")} / COLEÇÃO
                    </div>
                    <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 3, color: "#fff", lineHeight: 1, marginBottom: 12 }}>
                      {col.name}
                    </h2>
                    {col.description && (
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#666", lineHeight: 1.6, marginBottom: 0 }}>
                        {col.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#555", letterSpacing: 1 }}>
                      {col.promptCount} {col.promptCount === 1 ? "PROMPT" : "PROMPTS"}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", letterSpacing: 1 }}>
                      → ABRIR
                    </span>
                  </div>
                </div>
              ))}

              {/* Add collection card */}
              <div
                data-hover
                onClick={() => setShowCreate(true)}
                style={{
                  background: "#080808",
                  border: "1px dashed #2a2a2a",
                  padding: "32px 28px",
                  cursor: "none",
                  transition: "border-color 0.2s, background 0.2s",
                  minHeight: 180,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${collections.length * 0.08}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "#0d0d0d"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#080808"; }}
              >
                <div style={{ width: 40, height: 40, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "rgba(255,255,255,0.15)" }}>+</div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#555", letterSpacing: 1 }}>NOVA COLEÇÃO</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", marginTop: 4, letterSpacing: 0.5 }}>organize seus prompts por tema</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCreate && <CreateCollectionModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </>
  );
}

// ─── Collection Screen (tela de prompts de uma coleção) ───────────────────────
function CollectionScreen({ collectionId }: { collectionId: number }) {
  const { navigateTo } = usePageTransition();
  const { user, isAuthenticated, logout } = useAuth();
  const { addXP, updateNexus } = useNexus();
  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const utils = trpc.useUtils();

  const { data: prompts = [], isLoading } = trpc.arquivo.getPrompts.useQuery({ collectionId });
  const { data: collections = [] } = trpc.arquivo.getCollections.useQuery();
  const collection = collections.find((c) => c.id === collectionId);

  const createPromptMut = trpc.arquivo.createPrompt.useMutation({
    onSuccess: () => {
      utils.arquivo.getPrompts.invalidate({ collectionId });
      utils.arquivo.getCollections.invalidate();
    },
  });
  const deletePromptMut = trpc.arquivo.deletePrompt.useMutation({
    onSuccess: () => {
      utils.arquivo.getPrompts.invalidate({ collectionId });
      utils.arquivo.getCollections.invalidate();
    },
  });
  const updatePromptMut = trpc.arquivo.updatePrompt.useMutation({
    onSuccess: () => utils.arquivo.getPrompts.invalidate({ collectionId }),
  });

  const allItems = prompts.map(dbToPromptItem);

  const handleSaveItem = useCallback(async (data: { title: string; tags: string[]; prompt: string; imgUrl?: string }) => {
    await createPromptMut.mutateAsync({ collectionId, ...data });
    addXP("imagem_salva");
    updateNexus((prev) => ({ ...prev, stats: { ...prev.stats, imagesGenerated: prev.stats.imagesGenerated + 1 } }));
  }, [collectionId, createPromptMut, addXP, updateNexus]);

  const handleDelete = useCallback((id: number) => {
    deletePromptMut.mutate({ id });
  }, [deletePromptMut]);

  const handleUpdateImg = useCallback((id: number, url: string) => {
    updatePromptMut.mutate({ id, imgUrl: url });
  }, [updatePromptMut]);

  return (
    <>
      <GrainOverlay />
      <GlobalHeader currentPage="arquivo" />
      <ToastContainer />

      {/* Header */}
      <header style={{ position: "sticky", top: 56, zIndex: 100, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)", borderBottom: "1px solid #2a2a2a", padding: "0 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <button
              style={{ background: "none", border: "none", color: "#999", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, cursor: "none", display: "flex", alignItems: "center", gap: 6 }}
              data-hover
              onClick={() => navigateTo("/arquivo")}
            >
              ← ARQUIVO
            </button>
            <div style={{ width: 1, height: 20, background: "#2a2a2a" }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>
                {collection?.name ?? "COLEÇÃO"}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#aaa", letterSpacing: 1 }}>
                galeria · {allItems.length} ref
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, padding: "3px 8px", border: "1px solid #2a2a2a", color: "#999" }}>
              {allItems.length} REF
            </div>
            <NexusBadge />
            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <button className="btn-cortex sm ghost" onClick={() => window.location.href = "/admin"} data-hover>ADMIN</button>
                )}
                <button className="btn-cortex sm ghost" onClick={() => logout()} data-hover>SAIR</button>
              </>
            ) : (
              <a href={getLoginUrl()} className="btn-cortex sm" style={{ textDecoration: "none" }} data-hover>ENTRAR</a>
            )}
            <button className="btn-cortex sm" onClick={() => setShowUpload(true)} data-hover>↑</button>
            <button className="btn-cortex sm ghost" onClick={() => setShowSettings(true)} data-hover>⚙</button>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main style={{ background: "#000", minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#aaa", letterSpacing: 1 }}>
              {collection?.description || "galeria de referências · edite qualquer prompt em linguagem natural"}
            </span>
            <button className="btn-cortex sm" onClick={() => setShowUpload(true)} data-hover style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12 }}>+</span> Adicionar imagem
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: "40px 0" }}>
              <ThinkingDots label="Carregando prompts..." />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 2 }}>
              {/* Add card */}
              <div
                onClick={() => setShowUpload(true)}
                data-hover
                style={{
                  background: "#080808",
                  border: "1px dashed #2a2a2a",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  aspectRatio: "3/4",
                  cursor: "none",
                  transition: "border-color 0.2s, background 0.2s",
                  gap: 12,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLDivElement).style.background = "#0d0d0d"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLDivElement).style.background = "#080808"; }}
              >
                <div style={{ width: 40, height: 40, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "rgba(255,255,255,0.2)" }}>+</div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#aaa", letterSpacing: 1 }}>Adicionar imagem</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a2a2a", marginTop: 4, letterSpacing: 0.5 }}>prompt gerado automaticamente</p>
                </div>
              </div>

              {allItems.map((item, index) => (
                <PromptCard
                  key={item.id}
                  item={item}
                  index={index}
                  onDelete={item.isUser ? handleDelete : undefined}
                  onUpdateImg={handleUpdateImg}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSave={handleSaveItem}
        />
      )}
    </>
  );
}

// ─── Main Export — routes to Library or Collection ────────────────────────────
export default function Arquivo() {
  const [matchCollection, paramsCollection] = useRoute("/arquivo/:id");

  if (matchCollection && paramsCollection?.id) {
    const collectionId = parseInt(paramsCollection.id, 10);
    if (!isNaN(collectionId)) {
      return <CollectionScreen collectionId={collectionId} />;
    }
  }

  return <LibraryScreen />;
}
