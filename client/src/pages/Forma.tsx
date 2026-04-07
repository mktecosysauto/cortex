import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useNexus } from "@/contexts/NexusContext";
import { GlobalHeader } from "@/components/GlobalHeader";
import { GrainOverlay, CustomCursor } from "@/components/CortexShell";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type BriefingStatus = "draft" | "sent" | "answered" | "archived";

const STATUS_LABELS: Record<BriefingStatus, string> = {
  draft: "RASCUNHO",
  sent: "ENVIADO",
  answered: "RESPONDIDO",
  archived: "ARQUIVADO",
};

const STATUS_STYLES: Record<BriefingStatus, string> = {
  draft: "text-[#555] border border-[#1a1a1a]",
  sent: "text-[#BA7517] border border-[rgba(186,117,23,0.3)]",
  answered: "text-white border border-[#333]",
  archived: "text-[#333] border border-dashed border-[#1a1a1a] opacity-50",
};

const PROJECT_TYPES = [
  { value: "identidade_visual", label: "Identidade Visual" },
  { value: "naming", label: "Naming" },
  { value: "campanha", label: "Campanha" },
  { value: "social_media", label: "Social Media" },
  { value: "publicidade", label: "Publicidade" },
  { value: "email_marketing", label: "Email Marketing" },
];

// ─── Question type ────────────────────────────────────────────────────────────
type Question = {
  id: string;
  text: string;
  type: string;
  hint?: string;
  required: boolean;
  options?: string[];
};

type QuestionsBank = Record<string, Question[]>;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Forma() {
  const [view, setView] = useState<"list" | "new">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ cursor: "none" }}>
      <GrainOverlay />
      <CustomCursor />
      <GlobalHeader currentPage="forma" />

      {/* Sub-header */}
      <div
        className="border-b border-[#1a1a1a] bg-[#0a0a0a] z-40"
        style={{ position: "sticky", top: 56 }}
      >
        <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] tracking-[3px] text-[#444] uppercase">CÓRTEX / FORMA</span>
            <span className="text-[#222]">·</span>
            <span className="font-mono text-[9px] tracking-[2px] text-[#555] uppercase">Briefing inteligente</span>
          </div>
          <div className="flex items-center gap-3">
            {view === "list" && (
              <>
                <div className="flex gap-1">
                  {["all", "draft", "sent", "answered"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`font-mono text-[8px] tracking-[2px] uppercase px-3 py-1 border transition-colors ${
                        filterStatus === s
                          ? "border-white text-white bg-white/5"
                          : "border-[#1a1a1a] text-[#444] hover:text-[#666]"
                      }`}
                    >
                      {s === "all" ? "TODOS" : STATUS_LABELS[s as BriefingStatus]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setView("new")}
                  className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 bg-white text-black hover:opacity-85 transition-opacity"
                >
                  + NOVO BRIEFING
                </button>
              </>
            )}
            {view === "new" && (
              <button
                onClick={() => setView("list")}
                className="font-mono text-[9px] tracking-[2px] uppercase text-[#444] hover:text-white transition-colors"
              >
                ← VOLTAR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: 56 }}>
        {view === "list" ? (
          <BriefingList filterStatus={filterStatus} onNew={() => setView("new")} />
        ) : (
          <NewBriefing onSuccess={() => setView("list")} onCancel={() => setView("list")} />
        )}
      </div>
    </div>
  );
}

// ─── Briefing List ────────────────────────────────────────────────────────────
function BriefingList({ filterStatus, onNew }: { filterStatus: string; onNew: () => void }) {
  const { data: briefings, isLoading, refetch } = trpc.forma.list.useQuery();
  const deleteMutation = trpc.forma.delete.useMutation({ onSuccess: () => refetch() });
  const archiveMutation = trpc.forma.archive.useMutation({ onSuccess: () => refetch() });
  const sendMutation = trpc.forma.send.useMutation({ onSuccess: () => refetch() });

  const filtered = briefings?.filter((b) => filterStatus === "all" || b.status === filterStatus) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-16 text-center">
        <span className="font-mono text-[9px] tracking-[3px] text-[#333] uppercase">CARREGANDO...</span>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-24 text-center">
        <p className="font-mono text-[9px] tracking-[3px] text-[#333] uppercase mb-6">
          {filterStatus === "all" ? "NENHUM BRIEFING AINDA" : `NENHUM BRIEFING ${STATUS_LABELS[filterStatus as BriefingStatus]}`}
        </p>
        {filterStatus === "all" && (
          <button
            onClick={onNew}
            className="font-mono text-[9px] tracking-[2px] uppercase px-6 py-3 bg-white text-black hover:opacity-85 transition-opacity"
          >
            + CRIAR PRIMEIRO BRIEFING
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["PROJETO", "CLIENTE", "TIPO", "STATUS", "DATA"].map((h) => (
              <th key={h} className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase text-left py-2 border-b border-[#111]">
                {h}
              </th>
            ))}
            <th className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase text-left py-2 border-b border-[#111]">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((b) => (
            <tr key={b.id} className="group border-b border-[#0f0f0f] hover:bg-white/[0.02] transition-colors">
              <td className="py-4 pr-4">
                <Link href={`/forma/${b.id}`}>
                  <span className="font-mono text-[11px] text-[#888] group-hover:text-white transition-colors cursor-pointer">
                    {b.title}
                  </span>
                </Link>
              </td>
              <td className="py-4 pr-4 font-mono text-[10px] text-[#555]">{b.clientName}</td>
              <td className="py-4 pr-4 font-mono text-[10px] text-[#444] uppercase">
                {PROJECT_TYPES.find((p) => p.value === b.projectType)?.label ?? b.projectType}
              </td>
              <td className="py-4 pr-4">
                <span className={`font-mono text-[8px] tracking-[1px] uppercase px-2 py-1 ${STATUS_STYLES[b.status as BriefingStatus]}`}>
                  {STATUS_LABELS[b.status as BriefingStatus] ?? b.status}
                </span>
              </td>
              <td className="py-4 pr-4 font-mono text-[10px] text-[#444]">
                {new Date(b.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </td>
              <td className="py-4">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {b.status === "draft" && (
                    <button
                      onClick={async () => {
                        const siteOrigin = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
                        const result = await sendMutation.mutateAsync({ id: b.id, origin: siteOrigin });
                        const link = `${siteOrigin}/b/${result.token}`;
                        await navigator.clipboard.writeText(link);
                        if (result.emailSent) {
                          toast.success(`Briefing enviado! Email enviado para ${b.clientEmail}. Link copiado.`);
                        } else {
                          toast.warning(`Briefing enviado! Email não pôde ser enviado automaticamente. Link copiado — envie manualmente.`);
                        }
                      }}
                      className="font-mono text-[8px] tracking-[1px] uppercase text-[#BA7517] hover:text-[#d4891e] transition-colors"
                    >
                      ENVIAR
                    </button>
                  )}
                  {b.status === "sent" && (
                    <>
                      <a
                        href={`${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/b/${b.publicToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[8px] tracking-[1px] uppercase text-[#4a9eff] hover:text-[#6bb3ff] transition-colors"
                      >
                        ABRIR LINK ↗
                      </a>
                      <button
                        onClick={async () => {
                          const link = `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/b/${b.publicToken}`;
                          await navigator.clipboard.writeText(link);
                          toast.success("Link copiado!");
                        }}
                        className="font-mono text-[8px] tracking-[1px] uppercase text-[#555] hover:text-white transition-colors"
                      >
                        COPIAR LINK
                      </button>
                    </>
                  )}
                  {b.status !== "archived" && (
                    <button
                      onClick={() => archiveMutation.mutate({ id: b.id })}
                      className="font-mono text-[8px] tracking-[1px] uppercase text-[#333] hover:text-[#555] transition-colors"
                    >
                      ARQUIVAR
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Excluir este briefing?")) deleteMutation.mutate({ id: b.id });
                    }}
                    className="font-mono text-[8px] tracking-[1px] uppercase text-[#2a1010] hover:text-[#ff4444] transition-colors"
                  >
                    EXCLUIR
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── New Briefing (3 steps) ───────────────────────────────────────────────────
function NewBriefing({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const { addXP } = useNexus();

  // Step 1 fields
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Step 2 fields
  const { data: questionsBank } = trpc.forma.getQuestionsBank.useQuery();
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");

  // Step 3 fields
  const [brandNameDisplay, setBrandNameDisplay] = useState("");
  const [brandColorPrimary, setBrandColorPrimary] = useState("#000000");
  const [brandColorSecondary, setBrandColorSecondary] = useState("#ffffff");
  const [openingMessage, setOpeningMessage] = useState("Olá! Estamos muito felizes em trabalhar com você. Por favor, responda as perguntas abaixo para que possamos criar algo incrível juntos.");
  const [closingMessage, setClosingMessage] = useState("Obrigado pelas suas respostas! Vamos analisar tudo com cuidado e entrar em contato em breve.");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.forma.create.useMutation({
    onSuccess: () => {
      addXP("forma_create");
      toast.success("Briefing criado! Rascunho salvo com sucesso.");
      onSuccess();
    },
  });

  const uploadLogoMutation = trpc.forma.uploadLogo.useMutation();

  const allQuestions: Question[] = questionsBank
    ? Object.values(questionsBank as QuestionsBank).flat()
    : [];

  function toggleQuestion(id: string) {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  }

  function addCategory(category: string) {
    const bank = questionsBank as QuestionsBank | undefined;
    const qs = bank?.[category] ?? [];
    const ids = qs.map((q) => q.id);
    setSelectedQuestionIds((prev) => {
      const existing = new Set(prev);
      ids.forEach((id) => existing.add(id));
      return Array.from(existing);
    });
  }

  function addCustomQuestion() {
    if (!customQuestion.trim()) return;
    const customId = `custom_${encodeURIComponent(JSON.stringify({ id: `custom_${Date.now()}`, text: customQuestion.trim(), type: "textarea", required: false }))}`;
    setSelectedQuestionIds((prev) => [...prev, customId]);
    setCustomQuestion("");
  }

  function removeQuestion(id: string) {
    setSelectedQuestionIds((prev) => prev.filter((q) => q !== id));
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    setSelectedQuestionIds((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  }

  function getQuestionText(id: string): string {
    if (id.startsWith("custom_")) {
      try {
        const obj = JSON.parse(decodeURIComponent(id.replace("custom_", "")));
        return obj.text ?? id;
      } catch {
        return id;
      }
    }
    return allQuestions.find((q) => q.id === id)?.text ?? id;
  }

  async function handleSubmit() {
    let brandLogoUrl: string | undefined;

    if (logoFile) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(logoFile);
      });
      // We'll upload after creating the briefing
      try {
        const tempResult = await createMutation.mutateAsync({
          title,
          projectType,
          clientName,
          clientEmail,
          brandColorPrimary,
          brandColorSecondary,
          brandNameDisplay: brandNameDisplay || undefined,
          openingMessage,
          closingMessage,
          questionIds: selectedQuestionIds,
        });
        // Upload logo
        const logoResult = await uploadLogoMutation.mutateAsync({
          briefingId: tempResult.id,
          fileBase64: base64,
          mimeType: logoFile.type,
        });
        brandLogoUrl = logoResult.url;
        return;
      } catch (e) {
        console.error(e);
        return;
      }
    }

    createMutation.mutate({
      title,
      projectType,
      clientName,
      clientEmail,
      brandColorPrimary,
      brandColorSecondary,
      brandNameDisplay: brandNameDisplay || undefined,
      brandLogoUrl,
      openingMessage,
      closingMessage,
      questionIds: selectedQuestionIds,
    });
  }

  const CATEGORY_LABELS: Record<string, string> = {
    identidade_visual: "IDENTIDADE VISUAL",
    naming: "NAMING",
    campanha: "CAMPANHA",
    social_media: "SOCIAL MEDIA",
    publicidade: "PUBLICIDADE",
    email_marketing: "EMAIL MARKETING",
    universal: "UNIVERSAIS",
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 flex items-center justify-center font-mono text-[9px] border transition-colors ${
                step === s
                  ? "border-white text-white bg-white/10"
                  : step > s
                  ? "border-[#333] text-[#555] bg-white/5"
                  : "border-[#1a1a1a] text-[#333]"
              }`}
            >
              {s}
            </div>
            <span className={`font-mono text-[8px] tracking-[2px] uppercase ${step === s ? "text-[#888]" : "text-[#333]"}`}>
              {s === 1 ? "PROJETO" : s === 2 ? "PERGUNTAS" : "IDENTIDADE"}
            </span>
            {s < 3 && <span className="text-[#1a1a1a] mx-1">—</span>}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="max-w-xl space-y-6">
          <h2 className="font-['Bebas_Neue'] text-3xl tracking-[3px] text-white">PROJETO E CLIENTE</h2>
          <div className="space-y-4">
            {[
              { label: "TÍTULO DO PROJETO", value: title, set: setTitle, placeholder: "ex: Identidade Visual — Café Moderno" },
              { label: "NOME DO CLIENTE", value: clientName, set: setClientName, placeholder: "ex: João Silva" },
              { label: "EMAIL DO CLIENTE", value: clientEmail, set: setClientEmail, placeholder: "ex: joao@empresa.com", type: "email" },
            ].map(({ label, value, set, placeholder, type }) => (
              <div key={label}>
                <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">{label}</label>
                <input
                  type={type ?? "text"}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-transparent border-b border-[#1a1a1a] text-white font-mono text-[12px] py-2 outline-none focus:border-[#444] placeholder:text-[#222] transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">TIPO DE PROJETO</label>
              <div className="grid grid-cols-3 gap-2">
                {PROJECT_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => setProjectType(pt.value)}
                    className={`font-mono text-[9px] tracking-[1px] uppercase px-3 py-2 border transition-colors ${
                      projectType === pt.value
                        ? "border-white text-white bg-white/10"
                        : "border-[#1a1a1a] text-[#444] hover:border-[#333] hover:text-[#666]"
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!title || !projectType || !clientName || !clientEmail}
            className="font-mono text-[9px] tracking-[2px] uppercase px-6 py-3 bg-white text-black hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            PRÓXIMO →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <h2 className="font-['Bebas_Neue'] text-3xl tracking-[3px] text-white mb-6">MONTAR FORMULÁRIO</h2>
          <div className="grid grid-cols-2 gap-8">
            {/* Left: question bank */}
            <div className="border-r border-[#111] pr-8 max-h-[65vh] overflow-y-auto">
              <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">BANCO DE PERGUNTAS</p>
              {questionsBank &&
                Object.entries(questionsBank as QuestionsBank).map(([cat, qs]) => (
                  <div key={cat} className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <button
                        onClick={() => addCategory(cat)}
                        className="font-mono text-[7px] tracking-[1px] uppercase text-[#333] hover:text-[#666] transition-colors"
                      >
                        + TODAS
                      </button>
                    </div>
                    {qs.map((q) => {
                      const isAdded = selectedQuestionIds.includes(q.id);
                      return (
                        <div key={q.id} className="flex items-start gap-2 py-2 border-b border-[#111]">
                          <span className="flex-1 font-mono text-[10px] text-[#444] leading-relaxed">{q.text}</span>
                          <button
                            onClick={() => toggleQuestion(q.id)}
                            className={`flex-shrink-0 w-5 h-5 flex items-center justify-center border text-[10px] transition-all ${
                              isAdded
                                ? "bg-white text-black border-white"
                                : "border-[#1a1a1a] text-[#333] hover:border-[#444] hover:text-[#666]"
                            }`}
                          >
                            {isAdded ? "✓" : "+"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>

            {/* Right: selected questions */}
            <div>
              <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">
                SEU FORMULÁRIO ({selectedQuestionIds.length} perguntas)
              </p>
              {selectedQuestionIds.length === 0 ? (
                <p className="font-mono text-[10px] text-[#222] italic">Adicione perguntas do banco ao lado →</p>
              ) : (
                <div className="space-y-1 max-h-[50vh] overflow-y-auto mb-4">
                  {selectedQuestionIds.map((id, idx) => (
                    <div key={id} className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] border border-[#111]">
                      <span className="font-mono text-[9px] text-[#333] min-w-[20px]">{idx + 1}</span>
                      <span className="flex-1 font-mono text-[10px] text-[#555] truncate">{getQuestionText(id)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveQuestion(idx, -1)} className="text-[#222] hover:text-[#555] text-[10px]">↑</button>
                        <button onClick={() => moveQuestion(idx, 1)} className="text-[#222] hover:text-[#555] text-[10px]">↓</button>
                        <button onClick={() => removeQuestion(id)} className="text-[#2a1010] hover:text-[#ff4444] text-[10px]">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Custom question */}
              <div className="flex gap-2 mt-4">
                <input
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomQuestion()}
                  placeholder="+ Pergunta personalizada..."
                  className="flex-1 bg-transparent border-b border-[#1a1a1a] text-white font-mono text-[11px] py-2 outline-none focus:border-[#333] placeholder:text-[#222] transition-colors"
                />
                <button
                  onClick={addCustomQuestion}
                  className="font-mono text-[8px] tracking-[1px] uppercase text-[#444] hover:text-white transition-colors px-2"
                >
                  ADD
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(1)} className="font-mono text-[9px] tracking-[2px] uppercase text-[#444] hover:text-white transition-colors">
              ← VOLTAR
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedQuestionIds.length === 0}
              className="font-mono text-[9px] tracking-[2px] uppercase px-6 py-3 bg-white text-black hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            >
              PRÓXIMO →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-5">
            <h2 className="font-['Bebas_Neue'] text-3xl tracking-[3px] text-white">IDENTIDADE VISUAL</h2>

            <div>
              <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">NOME EXIBIDO NO FORMULÁRIO</label>
              <input
                value={brandNameDisplay}
                onChange={(e) => setBrandNameDisplay(e.target.value)}
                placeholder="Como aparece para o cliente"
                className="w-full bg-transparent border-b border-[#1a1a1a] text-white font-mono text-[12px] py-2 outline-none focus:border-[#444] placeholder:text-[#222] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">COR PRINCIPAL</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColorPrimary}
                    onChange={(e) => setBrandColorPrimary(e.target.value)}
                    className="w-8 h-8 border border-[#1a1a1a] bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-[#555]">{brandColorPrimary}</span>
                </div>
              </div>
              <div>
                <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">COR SECUNDÁRIA</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColorSecondary}
                    onChange={(e) => setBrandColorSecondary(e.target.value)}
                    className="w-8 h-8 border border-[#1a1a1a] bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-[#555]">{brandColorSecondary}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">LOGO DA MARCA</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    const url = URL.createObjectURL(file);
                    setLogoPreview(url);
                  }
                }}
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 border border-[#1a1a1a] text-[#444] hover:border-[#333] hover:text-[#666] transition-colors"
              >
                {logoPreview ? "TROCAR LOGO" : "UPLOAD DE LOGO"}
              </button>
              {logoPreview && (
                <img src={logoPreview} alt="Logo preview" className="mt-3 max-h-12 object-contain" />
              )}
            </div>

            <div>
              <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">MENSAGEM DE ABERTURA</label>
              <textarea
                value={openingMessage}
                onChange={(e) => setOpeningMessage(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-[#1a1a1a] text-white font-mono text-[11px] p-3 outline-none focus:border-[#333] placeholder:text-[#222] transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[8px] tracking-[3px] text-[#444] uppercase mb-2">MENSAGEM DE ENCERRAMENTO</label>
              <textarea
                value={closingMessage}
                onChange={(e) => setClosingMessage(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-[#1a1a1a] text-white font-mono text-[11px] p-3 outline-none focus:border-[#333] placeholder:text-[#222] transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="font-mono text-[9px] tracking-[2px] uppercase text-[#444] hover:text-white transition-colors">
                ← VOLTAR
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="font-mono text-[9px] tracking-[2px] uppercase px-6 py-3 bg-white text-black hover:opacity-85 disabled:opacity-50 transition-opacity"
              >
                {createMutation.isPending ? "SALVANDO..." : "SALVAR RASCUNHO"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">PREVIEW DO FORMULÁRIO</p>
            <div
              className="border border-[#1a1a1a] rounded-none overflow-hidden"
              style={{ backgroundColor: brandColorSecondary, minHeight: 320 }}
            >
              {/* Header */}
              <div
                className="px-6 py-4 flex items-center justify-between border-b"
                style={{ borderColor: `${brandColorPrimary}20` }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-h-8 object-contain" />
                ) : (
                  <span
                    className="font-mono text-[11px] tracking-[2px] uppercase"
                    style={{ color: brandColorPrimary }}
                  >
                    {brandNameDisplay || "SUA MARCA"}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px]" style={{ color: brandColorPrimary, opacity: 0.5 }}>1 / {selectedQuestionIds.length || 1}</span>
                  <div className="w-20 h-[2px]" style={{ backgroundColor: `${brandColorPrimary}20` }}>
                    <div className="h-full w-[12%]" style={{ backgroundColor: brandColorPrimary }} />
                  </div>
                </div>
              </div>
              {/* Question preview */}
              <div className="px-6 py-8">
                {openingMessage && (
                  <p className="font-sans text-[12px] mb-6 leading-relaxed" style={{ color: brandColorPrimary, opacity: 0.7 }}>
                    {openingMessage}
                  </p>
                )}
                <p className="font-serif text-[18px] leading-snug mb-6" style={{ color: brandColorPrimary }}>
                  {selectedQuestionIds.length > 0
                    ? getQuestionText(selectedQuestionIds[0])
                    : "Sua primeira pergunta aparecerá aqui"}
                </p>
                <div
                  className="border-b-2 py-2 font-sans text-[14px] opacity-30"
                  style={{ borderColor: brandColorPrimary, color: brandColorPrimary }}
                >
                  Digite sua resposta...
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <button
                    className="px-5 py-2 font-sans text-[12px] font-medium"
                    style={{ backgroundColor: brandColorPrimary, color: brandColorSecondary }}
                  >
                    Continuar →
                  </button>
                  <span className="font-mono text-[10px] opacity-30" style={{ color: brandColorPrimary }}>
                    Pressione Enter ↵
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
