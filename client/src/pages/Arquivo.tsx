import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { GrainOverlay, CustomCursor } from "@/components/CortexShell";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PromptItem {
  id: number;
  vehicle: string;
  tags: string[];
  prompt: string;
  imgData?: string | null;
  isUser?: boolean;
}

// ─── BASE PROMPTS ─────────────────────────────────────────────────────────────
const BASE_PROMPTS: PromptItem[] = [
  { id: 1, vehicle: "PORSCHE 911 — BLACK", tags: ["Side Profile", "Misty Field", "Moody"], prompt: "A cinematic landscape image featuring a vintage black Porsche 911 parked on a straight road cutting through lush green field. Side view, crisp detailing. Moody atmosphere, vibrant foreground fading into soft mist. Mist blurs horizon. Atmospheric and dramatic, balance of realism and artistic mood." },
  { id: 2, vehicle: "PORSCHE 911 — SILVER", tags: ["Front 3/4", "Golden Hour", "Country Road"], prompt: "Photorealistic. Classic Porsche 911 driving towards viewer on winding country road, golden hour. Road curves right, lush green banks, fallen leaves. Stone bridge, rolling sunlit hills, autumn foliage. Warm sunlight through branches, long soft shadows. Golden glow, pastel sky, wispy clouds. Ultra-sharp, cinematic lighting, HDR, realistic reflections." },
  { id: 3, vehicle: "BMW F30 — BLACK", tags: ["Motion Shot", "Dirt Track", "8K"], prompt: "Photo of a black BMW F30 participating in a race on a track with flying 3D dirt and dust particles, motion shot, ultra-detailed photo, 8K quality." },
  { id: 4, vehicle: "PORSCHE 911 DAKAR 930", tags: ["Ultra-Low Angle", "Forest Rally", "Mud Splatter"], prompt: "Rugged off-road rally scene, dense sunlit forest. Classic 911 Dakar (930) speeds on dirt trail. Ultra-low close-up, front right side, slight upward tilt, 20mm wide-angle near front left wheel. Headlight on, glowing warmly. Body splattered with mud. Rally tires kick up soil and dirt particles frozen mid-air. Sharp foreground dirt, slightly blurred background. Natural colors, cinematic lighting, photorealistic, high resolution." },
  { id: 5, vehicle: "MERCEDES G-CLASS — MATURE", tags: ["Human Model", "Mountain Lake", "Mature Male"], prompt: "Casual spontaneous candid. Mature European man leaning against matte black Mercedes-Benz G-Class SUV beside tranquil mountain lake. Lived-in dark-gray wool jacket, black t-shirt, loose gray pants, crisp white sneakers. Lake reflects pine-covered peaks. Natural ambient light on jacket wool texture and worn SUV surface. Eye level, relaxed off-center composition. Authentic skin texture, fabric grain, environmental shadows. iPhone snapshot feel. Quietly contemplative. Urban style meets natural stillness." },
  { id: 6, vehicle: "MERCEDES G-CLASS — YOUNG", tags: ["Human Model", "Mountain Lake", "Young Male"], prompt: "Casual spontaneous candid. Young European man leaning against matte black Mercedes-Benz G-Class SUV beside tranquil mountain lake. Dark-gray wool jacket, black t-shirt, loose gray pants, crisp white sneakers. Lake reflects pine-covered peaks. Natural ambient light. Eye level, relaxed off-center composition. Authentic skin texture, fabric grain. iPhone snapshot feel." },
  { id: 7, vehicle: "RED SPORT COUPE", tags: ["Overhead Top-Down", "Male Model", "Editorial"], prompt: "High-end automotive campaign shot, overhead top-down composition, full red sport coupe fully visible, door open, male model as luxury streetwear, clean minimalist asphalt, softbox-like daylight, controlled shadows, immaculate reflections, premium editorial retouching, photoreal, no text, no watermark, no busy background." },
  { id: 8, vehicle: "VINTAGE GREEN SEDAN", tags: ["Fashion Portrait", "Colonnade", "Retro Luxury"], prompt: "Cinematic fashion portrait. Asian man early 30s, vintage green classic sedan. Dark green fur coat, mustard-brown cardigan, patterned yellow shirt, olive tailored trousers, brown leather loafers, mustard socks, dark green fedora. Brown-tinted aviators, cigarette. Grand neoclassical colonnade, tall stone pillars, symmetrical corridor, black-and-white checkered marble floor. Soft morning fog, pink flowers. Soft cinematic daylight. Muted greens, warm mustard tones, teal shadows. Retro luxury. 50mm, shallow DOF." },
  { id: 9, vehicle: "AUDI R8 — RED", tags: ["Overhead Top-Down", "Dark Garage", "Editorial"], prompt: "High-end automotive campaign shot, overhead top-down composition, full red Audi R8 fully visible, door open, male model in luxury streetwear, dark dramatic garage setting, controlled spotlights, immaculate reflections on polished floor, premium editorial retouching, photoreal, no text, no watermark." },
  { id: 10, vehicle: "LAMBORGHINI URUS", tags: ["Low Angle Rear", "Off-Road Mud", "Action"], prompt: "Ultra-realistic action shot. Lamborghini Urus tearing through muddy off-road trail at high speed, low dynamic frontal angle. Mud splashes violently, flying debris and water droplets frozen mid-air. Massive wheels in motion, coated in thick mud, power and aggression. Dirt textures, reflections, realistic lighting on body contours. Cloudy sky, dramatic light breaking through. Intense motion blur, bokeh from mud and water splatter. Raw movement, energy, off-road domination, cinematic style." },
  { id: 11, vehicle: "TOYOTA CARINA — WHITE", tags: ["Side 3/4", "Daisy Field", "Japanese"], prompt: "Photorealistic 1993 Toyota Carina, white. Parked in field among white daisies and green grass. Daisies in style of Japanese drawing. Japanese mountains background. Slightly sideways, hood facing viewer, right side forward. Cool wheels. Professional photography, natural lighting. --ar 3:4, --v7" },
  { id: 12, vehicle: "PORSCHE 911 — NIGHT CITY", tags: ["Front 3/4", "Night", "Urban Neon"], prompt: "Photorealistic Porsche 911 parked on wet urban street at night. Front 3/4 view. Neon reflections on wet asphalt, city lights bokeh background. Low ambient light, dramatic highlights on bodywork. Cinematic night photography, shallow depth of field, 35mm lens." },
  { id: 13, vehicle: "FERRARI — EDITORIAL", tags: ["Studio", "White Background", "Luxury"], prompt: "Studio automotive photography. Ferrari on pure white seamless background. Three-quarter front view. Professional automotive lighting setup, perfectly even illumination, subtle shadow under car. Ultra-sharp details, paint reflections, chrome details. Luxury car catalog style, photoreal, no text." },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
const LS_KEY = "apg_items_v2";
const LS_FP = "apg_fp_key";
const LS_ANTH = "apg_anth_key";

function getFpKey() { return localStorage.getItem(LS_FP) || ""; }
function getAnthKey() { return localStorage.getItem(LS_ANTH) || ""; }

function loadUserItems(): PromptItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUserItems(items: PromptItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    const noImg = items.map((it) => ({ ...it, imgData: null }));
    localStorage.setItem(LS_KEY, JSON.stringify(noImg));
  }
}

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

// ─── Thinking Dots ────────────────────────────────────────────────────────────
function ThinkingDots({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      {label && (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#666", marginLeft: 4 }}>
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
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "none" }}>✕</button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#666", letterSpacing: 1, display: "block", marginBottom: 8, textTransform: "uppercase" }}>
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
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#666", letterSpacing: 1, display: "block", marginBottom: 8, textTransform: "uppercase" }}>
            Anthropic API Key <span style={{ color: "#444" }}>(opcional)</span>
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

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSave }: { onClose: () => void; onSave: (item: PromptItem) => void }) {
  const [imgData, setImgData] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImgData(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const generatePrompt = async () => {
    if (!imgData) { showToast("Adicione uma imagem primeiro", "error"); return; }
    const key = getAnthKey();
    if (!key) { showToast("Configure a Anthropic API Key nas configurações", "error"); return; }

    setLoading(true);
    try {
      const base64 = imgData.split(",")[1];
      const mediaType = imgData.split(";")[0].split(":")[1] || "image/jpeg";

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: "Analyze this image and write a detailed image generation prompt that would reproduce this scene. Include: camera angle, lighting, atmosphere, subject details, background, color palette, depth of field, and photographic style. Write in English. Return ONLY the prompt, no explanation." },
            ],
          }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setPrompt(data.content?.[0]?.text || "");
      showToast("Prompt gerado com sucesso", "success");
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!vehicle.trim()) { showToast("Informe o nome do veículo", "error"); return; }
    if (!prompt.trim()) { showToast("Gere ou escreva um prompt", "error"); return; }
    const newItem: PromptItem = {
      id: Date.now(),
      vehicle: vehicle.toUpperCase(),
      tags: [],
      prompt,
      imgData: imgData || null,
      isUser: true,
    };
    onSave(newItem);
    showToast("Referência salva na galeria", "success");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box panel-scroll" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#fff" }}>
            ADICIONAR REFERÊNCIA
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "none" }}>✕</button>
        </div>

        {/* Drop zone */}
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
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#666" }}>
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

        <button className="btn-cortex" style={{ width: "100%", justifyContent: "center", marginBottom: 16 }} onClick={generatePrompt} disabled={loading}>
          {loading ? <ThinkingDots label="Analisando imagem..." /> : "→ Gerar Prompt com IA"}
        </button>

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
              <button className="btn-cortex sm" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave}>
                + Salvar na Galeria
              </button>
            </div>
          </>
        )}

        {!prompt && (
          <button className="btn-cortex sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={handleSave}>
            + Salvar na Galeria
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

  const run = async () => {
    const key = getFpKey();
    if (!key) { showToast("Configure a Freepik API Key nas configurações", "error"); return; }
    setLoading(true);
    setResult(null);

    try {
      if (type === "improve") {
        setStatusMsg("Melhorando prompt...");
        const res = await fetch("https://api.freepik.com/v1/ai/improve-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-freepik-api-key": key },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        const taskId = data.data?.task_id || data.task_id;
        if (taskId) {
          setStatusMsg("Aguardando resultado...");
          const done = await fpPoll(`https://api.freepik.com/v1/ai/improve-prompt/${taskId}`, key);
          setResult(done.prompt || done.data?.prompt || "");
        } else {
          setResult(data.data?.prompt || data.prompt || "");
        }
        showToast("Prompt melhorado!", "success");
      }

      else if (type === "generate") {
        setStatusMsg("Gerando imagem...");
        const res = await fetch("https://api.freepik.com/v1/ai/mystic", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-freepik-api-key": key },
          body: JSON.stringify({ prompt, aspect_ratio: "3:4", realism: true }),
        });
        const data = await res.json();
        const taskId = data.data?.task_id || data.task_id;
        setStatusMsg("Renderizando...");
        const done = await fpPoll(`https://api.freepik.com/v1/ai/mystic/${taskId}`, key);
        const imgUrl = done.images?.[0]?.url || done.url || "";
        setResult(imgUrl);
        showToast("Imagem gerada!", "success");
      }

      else if (type === "upscale") {
        if (!imgData) { showToast("Sem imagem para upscale", "error"); setLoading(false); return; }
        setStatusMsg("Fazendo upscale...");
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
        const res = await fetch("https://api.freepik.com/v1/ai/image-upscaler", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-freepik-api-key": key },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        const taskId = data.data?.task_id || data.task_id;
        setStatusMsg("Processando...");
        const done = await fpPoll(`https://api.freepik.com/v1/ai/image-upscaler/${taskId}`, key);
        setResult(done.images?.[0]?.url || done.url || "");
        showToast("Upscale concluído!", "success");
      }

      else if (type === "animate") {
        if (!imgData) { showToast("Sem imagem para animar", "error"); setLoading(false); return; }
        setStatusMsg("Iniciando animação...");
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
        const res = await fetch("https://api.freepik.com/v1/ai/image-to-video/kling-v2-5-pro", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-freepik-api-key": key },
          body: JSON.stringify({ image: base64, prompt, duration: 5, aspect_ratio: "3:4" }),
        });
        const data = await res.json();
        const taskId = data.data?.task_id || data.task_id;
        setStatusMsg("Gerando vídeo (pode levar até 4 min)...");
        const done = await fpPoll(`https://api.freepik.com/v1/ai/image-to-video/kling-v2-5-pro/${taskId}`, key, 240000);
        setResult(done.video_url || done.url || "");
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
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#666", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
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
          {(type === "improve") && (
            <>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", lineHeight: 1.6, marginBottom: 10 }}>{result}</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-cortex sm ghost" onClick={() => { navigator.clipboard.writeText(result); showToast("Copiado!", "success"); }}>Copiar</button>
                <button className="btn-cortex sm ghost" onClick={() => { setResult(null); }}>Tentar novamente</button>
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

  // Reveal animation
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

  const generatePrompt = async () => {
    const key = getAnthKey();
    if (!key) { showToast("Configure a Anthropic API Key nas configurações", "error"); return; }
    if (!editRequest.trim()) { showToast("Descreva o que você quer mudar", "error"); return; }

    setEditLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1000,
          system: "You are an expert at writing image generation prompts. Edit the prompt based on the user's request. Return ONLY the updated prompt, no explanation.",
          messages: [{ role: "user", content: `Original prompt: ${editPrompt}\nRequest: ${editRequest}` }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setEditResult(data.content?.[0]?.text || "");
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
        opacity: 0,
        transition: `opacity 0.5s ease ${Math.min(index * 0.05, 0.5)}s`,
        animation: `fadeUp 0.5s ease ${Math.min(index * 0.05, 0.5)}s both`,
      }}
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

        {/* Badge number */}
        <div style={{ position: "absolute", top: 8, left: 8, fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#666", background: "rgba(0,0,0,0.7)", padding: "2px 6px", letterSpacing: 1 }}>
          {item.id.toString().padStart(2, "0")}
        </div>

        {/* Delete button (user items only) */}
        {item.isUser && (
          <button
            onClick={handleDelete}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.8)", border: "1px solid #2a2a2a", color: "#666", width: 24, height: 24, cursor: "none", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}
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
        <button
          className="btn-cortex sm ghost"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={toggleEdit}
        >
          ✦ Editar
        </button>
        <button
          className="btn-cortex sm ghost"
          onClick={() => setPromptExpanded((p) => !p)}
        >
          {promptExpanded ? "Menos" : "Ver tudo"}
        </button>
      </div>

      {/* Edit Panel */}
      <div className={`collapse-panel${editOpen ? " open" : ""}`}>
        <div style={{ padding: "12px 14px", borderTop: "1px solid #2a2a2a" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#666", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
            Editar Prompt
          </div>
          <textarea
            className="textarea-cortex"
            style={{ minHeight: 80, marginBottom: 8 }}
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
          />
          <input
            className="input-cortex"
            style={{ marginBottom: 8 }}
            placeholder="O que você quer mudar?"
            value={editRequest}
            onChange={(e) => setEditRequest(e.target.value)}
          />
          <button
            className="btn-cortex sm"
            style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
            onClick={generatePrompt}
            disabled={editLoading}
          >
            {editLoading ? <ThinkingDots label="Gerando..." /> : "→ Gerar Prompt Atualizado"}
          </button>

          {editResult && (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#666", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Resultado</div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#999", lineHeight: 1.6, marginBottom: 8 }}>{editResult}</p>
              <button
                className="btn-cortex sm ghost"
                onClick={() => { navigator.clipboard.writeText(editResult); showToast("Copiado!", "success"); }}
              >
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

// ─── Main Arquivo Page ────────────────────────────────────────────────────────
export default function Arquivo() {
  const [userItems, setUserItems] = useState<PromptItem[]>(() => loadUserItems());
  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const allItems = [...BASE_PROMPTS, ...userItems];

  const handleSaveItem = useCallback((item: PromptItem) => {
    setUserItems((prev) => {
      const next = [...prev, item];
      saveUserItems(next);
      return next;
    });
  }, []);

  const handleDelete = useCallback((id: number) => {
    setUserItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      saveUserItems(next);
      return next;
    });
  }, []);

  const handleUpdateImg = useCallback((id: number, url: string) => {
    setUserItems((prev) => {
      const next = prev.map((it) => it.id === id ? { ...it, imgData: url } : it);
      saveUserItems(next);
      return next;
    });
  }, []);

  const clearUserItems = () => {
    setUserItems([]);
    saveUserItems([]);
    showToast("Cards do usuário removidos", "success");
  };

  return (
    <>
      <GrainOverlay />
      <CustomCursor />
      <ToastContainer />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid #2a2a2a",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          {/* Left: back + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/">
              <button style={{ background: "none", border: "none", color: "#666", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, cursor: "none", display: "flex", alignItems: "center", gap: 6 }} data-hover>
                ← CÓRTEX
              </button>
            </Link>
            <div style={{ width: 1, height: 20, background: "#2a2a2a" }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>
                ARQUIVO
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", letterSpacing: 1 }}>
                galeria · v2.0
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Badge */}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, padding: "3px 8px", border: "1px solid #2a2a2a", color: "#666" }}>
              {allItems.length} REF
            </div>

            {userItems.length > 0 && (
              <button className="btn-cortex sm ghost" onClick={clearUserItems} title="Limpar cards do usuário">
                🗑
              </button>
            )}

            <button className="btn-cortex sm" onClick={() => setShowUpload(true)} data-hover>
              ↑
            </button>

            <button className="btn-cortex sm ghost" onClick={() => setShowSettings(true)} data-hover>
              ⚙
            </button>
          </div>
        </div>
      </header>

      {/* ── GALLERY ────────────────────────────────────────────────────────── */}
      <main style={{ background: "#000", minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          {/* Gallery label */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", letterSpacing: 1 }}>
              galeria de referências · edite qualquer prompt em linguagem natural
            </span>
          </div>

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 2,
          }}>
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
        </div>
      </main>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSave={handleSaveItem} />}
    </>
  );
}
