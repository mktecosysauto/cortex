import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useNexus } from "@/contexts/NexusContext";
import { GlobalHeader } from "@/components/GlobalHeader";
import { GrainOverlay, CustomCursor } from "@/components/CortexShell";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const PROJECT_TYPE_LABELS: Record<string, string> = {
  identidade_visual: "Identidade Visual",
  naming: "Naming",
  campanha: "Campanha",
  social_media: "Social Media",
  publicidade: "Publicidade",
  email_marketing: "Email Marketing",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "RASCUNHO",
  sent: "ENVIADO",
  answered: "RESPONDIDO",
  archived: "ARQUIVADO",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "text-[#555] border border-[#1a1a1a]",
  sent: "text-[#BA7517] border border-[rgba(186,117,23,0.3)]",
  answered: "text-white border border-[#333]",
  archived: "text-[#333] border border-dashed border-[#1a1a1a] opacity-50",
};

export default function FormaDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { addXP } = useNexus();

  const [activeTab, setActiveTab] = useState<"overview" | "responses" | "analysis" | "followup">("overview");
  const [followupQuestion, setFollowupQuestion] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editOpeningMessage, setEditOpeningMessage] = useState("");
  const [editClosingMessage, setEditClosingMessage] = useState("");

  const { data, isLoading, refetch } = trpc.forma.get.useQuery({ id }, { enabled: !!id });
  const sendMutation = trpc.forma.send.useMutation({
    onSuccess: (result) => {
      refetch();
      if (result.emailSent) {
        toast.success(`Briefing enviado! Email enviado para ${data?.briefing?.clientEmail ?? "o cliente"}.`);
      } else {
        toast.warning("Briefing enviado! Email não pôde ser enviado automaticamente. Copie o link e envie manualmente.");
      }
    },
    onError: (e) => toast.error(`Erro ao enviar: ${e.message}`),
  });
  const resendMutation = trpc.forma.resend.useMutation({
    onSuccess: (result) => {
      if (result.emailSent) {
        toast.success("Email reenviado com sucesso!");
      } else {
        toast.warning(`Email não pôde ser enviado: ${result.emailError ?? "erro desconhecido"}. Copie o link e envie manualmente.`);
      }
    },
    onError: (e) => toast.error(`Erro ao reenviar: ${e.message}`),
  });
  const archiveMutation = trpc.forma.archive.useMutation({ onSuccess: () => refetch() });
  const generateAnalysisMutation = trpc.forma.generateAnalysis.useMutation({
    onSuccess: () => {
      addXP("forma_analysis");
      toast.success("Análise gerada com sucesso!");
      refetch();
      setActiveTab("analysis");
    },
    onError: (e) => toast.error(`Erro ao gerar análise: ${e.message}`),
  });
  const addFollowupMutation = trpc.forma.addFollowup.useMutation({
    onSuccess: () => {
      toast.success("Pergunta de acompanhamento adicionada!");
      setFollowupQuestion("");
      refetch();
    },
  });
  const updateMutation = trpc.forma.update.useMutation({
    onSuccess: () => {
      toast.success("Briefing atualizado!");
      setEditOpen(false);
      refetch();
    },
    onError: (e) => toast.error(`Erro ao atualizar: ${e.message}`),
  });

  function openEdit() {
    setEditTitle(data?.briefing?.title ?? "");
    setEditClientName(data?.briefing?.clientName ?? "");
    setEditClientEmail(data?.briefing?.clientEmail ?? "");
    setEditOpeningMessage(data?.briefing?.openingMessage ?? "");
    setEditClosingMessage(data?.briefing?.closingMessage ?? "");
    setEditOpen(true);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center" style={{ cursor: "none" }}>
        <GrainOverlay />
        <CustomCursor />
        <span className="font-mono text-[9px] tracking-[3px] text-[#333] uppercase">CARREGANDO...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center" style={{ cursor: "none" }}>
        <GrainOverlay />
        <CustomCursor />
        <span className="font-mono text-[9px] tracking-[3px] text-[#555] uppercase">Briefing não encontrado</span>
      </div>
    );
  }

  const { briefing, responses, followups } = data;
  const siteOrigin = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
  const publicLink = `${siteOrigin}/b/${briefing.publicToken}`;

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
            <button
              onClick={() => window.history.back()}
              className="font-mono text-[9px] tracking-[2px] text-[#444] hover:text-white transition-colors uppercase"
            >
              ← FORMA
            </button>
            <span className="text-[#222]">·</span>
            <span className="font-mono text-[9px] tracking-[2px] text-[#666] truncate max-w-[200px]">
              {briefing.title}
            </span>
            <span
              className={`font-mono text-[8px] tracking-[1px] uppercase px-2 py-1 ${STATUS_STYLES[briefing.status] ?? ""}`}
            >
              {STATUS_LABELS[briefing.status] ?? briefing.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {briefing.status === "draft" && (
              <button
                onClick={async () => {
                  const result = await sendMutation.mutateAsync({ id, origin: siteOrigin });
                  const link = `${siteOrigin}/b/${result.token}`;
                  await navigator.clipboard.writeText(link);
                }}
                disabled={sendMutation.isPending}
                className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 bg-[#BA7517] text-white hover:opacity-85 disabled:opacity-50 transition-opacity"
              >
                ENVIAR AO CLIENTE
              </button>
            )}
            {briefing.status === "sent" && (
              <>
                <button
                  onClick={() => resendMutation.mutate({ id, origin: siteOrigin })}
                  disabled={resendMutation.isPending}
                  className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 border border-[rgba(186,117,23,0.4)] text-[#BA7517] hover:opacity-85 disabled:opacity-50 transition-opacity"
                >
                  {resendMutation.isPending ? "ENVIANDO..." : "REENVIAR EMAIL"}
                </button>
                <a
                  href={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 border border-[rgba(74,158,255,0.4)] text-[#4a9eff] hover:opacity-85 transition-opacity"
                >
                  ABRIR LINK ↗
                </a>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(publicLink);
                    toast.success("Link copiado!");
                  }}
                  className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 border border-[#1a1a1a] text-[#555] hover:text-white hover:border-[#333] transition-colors"
                >
                  COPIAR LINK
                </button>
              </>
            )}
            {briefing.status === "answered" && (
              <>
                <a
                  href={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 border border-[rgba(74,158,255,0.4)] text-[#4a9eff] hover:opacity-85 transition-opacity"
                >
                  ABRIR LINK ↗
                </a>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(publicLink);
                    toast.success("Link copiado!");
                  }}
                  className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 border border-[#1a1a1a] text-[#555] hover:text-white hover:border-[#333] transition-colors"
                >
                  COPIAR LINK
                </button>
              </>
            )}
            {briefing.status === "answered" && !briefing.aiSummary && (
              <button
                onClick={() => generateAnalysisMutation.mutate({ id })}
                disabled={generateAnalysisMutation.isPending}
                className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 bg-white text-black hover:opacity-85 disabled:opacity-50 transition-opacity"
              >
                {generateAnalysisMutation.isPending ? "ANALISANDO..." : "GERAR ANÁLISE IA"}
              </button>
            )}
            <button
              onClick={openEdit}
              className="font-mono text-[9px] tracking-[2px] uppercase text-[#444] hover:text-white transition-colors"
            >
              EDITAR
            </button>
            {briefing.status !== "archived" && (
              <button
                onClick={() => archiveMutation.mutate({ id })}
                className="font-mono text-[9px] tracking-[2px] uppercase text-[#333] hover:text-[#555] transition-colors"
              >
                ARQUIVAR
              </button>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setEditOpen(false)}>
            <div
              className="bg-[#0f0f0f] border border-[#1a1a1a] w-full max-w-lg mx-4 p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-mono text-[9px] tracking-[3px] text-[#555] uppercase">EDITAR BRIEFING</span>
                <button onClick={() => setEditOpen(false)} className="font-mono text-[9px] text-[#333] hover:text-white">ESC</button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="font-mono text-[8px] tracking-[2px] text-[#444] uppercase block mb-2">NOME DO PROJETO</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[11px] px-4 py-3 focus:outline-none focus:border-[#333]"
                    placeholder="Nome do projeto"
                  />
                </div>
                <div>
                  <label className="font-mono text-[8px] tracking-[2px] text-[#444] uppercase block mb-2">NOME DO CLIENTE</label>
                  <input
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[11px] px-4 py-3 focus:outline-none focus:border-[#333]"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <label className="font-mono text-[8px] tracking-[2px] text-[#444] uppercase block mb-2">EMAIL DO CLIENTE</label>
                  <input
                    type="email"
                    value={editClientEmail}
                    onChange={(e) => setEditClientEmail(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[11px] px-4 py-3 focus:outline-none focus:border-[#333]"
                    placeholder="email@cliente.com"
                  />
                </div>
                <div>
                  <label className="font-mono text-[8px] tracking-[2px] text-[#444] uppercase block mb-2">MENSAGEM DE ABERTURA</label>
                  <textarea
                    value={editOpeningMessage}
                    onChange={(e) => setEditOpeningMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[11px] px-4 py-3 focus:outline-none focus:border-[#333] resize-none"
                    placeholder="Mensagem exibida ao cliente no início do formulário"
                  />
                </div>
                <div>
                  <label className="font-mono text-[8px] tracking-[2px] text-[#444] uppercase block mb-2">MENSAGEM DE ENCERRAMENTO</label>
                  <textarea
                    value={editClosingMessage}
                    onChange={(e) => setEditClosingMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[11px] px-4 py-3 focus:outline-none focus:border-[#333] resize-none"
                    placeholder="Mensagem exibida ao cliente após responder"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => updateMutation.mutate({
                    id,
                    title: editTitle,
                    clientName: editClientName,
                    clientEmail: editClientEmail,
                    openingMessage: editOpeningMessage || null,
                    closingMessage: editClosingMessage || null,
                  })}
                  disabled={updateMutation.isPending || !editTitle || !editClientName || !editClientEmail}
                  className="flex-1 font-mono text-[9px] tracking-[2px] uppercase px-4 py-3 bg-white text-black hover:opacity-85 disabled:opacity-50 transition-opacity"
                >
                  {updateMutation.isPending ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-3 border border-[#1a1a1a] text-[#444] hover:text-white hover:border-[#333] transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-8 flex gap-0 border-t border-[#111]">
          {(["overview", "responses", "analysis", "followup"] as const).map((tab) => {
            const labels = { overview: "VISÃO GERAL", responses: `RESPOSTAS (${responses.length})`, analysis: "ANÁLISE IA", followup: `ACOMPANHAMENTO (${followups.length})` };
            const isActive = activeTab === tab;
            const isDisabled = (tab === "responses" && responses.length === 0) || (tab === "analysis" && !briefing.aiSummary) || (tab === "followup" && briefing.status === "draft");
            return (
              <button
                key={tab}
                onClick={() => !isDisabled && setActiveTab(tab)}
                className={`font-mono text-[8px] tracking-[2px] uppercase px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? "border-white text-white"
                    : isDisabled
                    ? "border-transparent text-[#222] cursor-not-allowed"
                    : "border-transparent text-[#444] hover:text-[#666]"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8" style={{ paddingTop: 56 }}>
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-1">PROJETO</p>
                <p className="font-['Bebas_Neue'] text-4xl tracking-[2px] text-white">{briefing.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "CLIENTE", value: briefing.clientName },
                  { label: "EMAIL", value: briefing.clientEmail },
                  { label: "TIPO", value: PROJECT_TYPE_LABELS[briefing.projectType] ?? briefing.projectType },
                  { label: "PERGUNTAS", value: `${(briefing.questionIds as string[]).length} selecionadas` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-1">{label}</p>
                    <p className="font-mono text-[11px] text-[#888]">{value}</p>
                  </div>
                ))}
              </div>

              {briefing.status === "answered" && (
                <div className="border border-[#1a1a1a] p-4 bg-white/[0.02]">
                  <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-2">RESPONDIDO EM</p>
                  <p className="font-mono text-[11px] text-[#888]">
                    {briefing.answeredAt
                      ? new Date(briefing.answeredAt).toLocaleString("pt-BR")
                      : "—"}
                  </p>
                </div>
              )}

              {briefing.status === "sent" && (
                <div className="border border-[rgba(186,117,23,0.2)] p-4 bg-[rgba(186,117,23,0.03)]">
                  <p className="font-mono text-[8px] tracking-[3px] text-[#BA7517] uppercase mb-2">LINK DO FORMULÁRIO</p>
                  <a
                    href={publicLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-[#4a9eff] break-all mb-3 block hover:underline"
                  >
                    {publicLink}
                  </a>
                  <div className="flex gap-3 mt-3">
                    <a
                      href={publicLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[8px] tracking-[2px] uppercase text-[#4a9eff] hover:text-[#6bb3ff] transition-colors"
                    >
                      ABRIR LINK ↗
                    </a>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(publicLink);
                        toast.success("Link copiado!");
                      }}
                      className="font-mono text-[8px] tracking-[2px] uppercase text-[#BA7517] hover:text-[#d4891e] transition-colors"
                    >
                      COPIAR LINK
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Brand identity preview */}
            <div>
              <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">IDENTIDADE DO FORMULÁRIO</p>
              <div
                className="border border-[#1a1a1a] overflow-hidden"
                style={{ backgroundColor: briefing.brandColorSecondary ?? "#ffffff", minHeight: 200 }}
              >
                <div
                  className="px-5 py-3 flex items-center justify-between border-b"
                  style={{ borderColor: `${briefing.brandColorPrimary ?? "#000000"}20` }}
                >
                  {briefing.brandLogoUrl ? (
                    <img src={briefing.brandLogoUrl} alt="Logo" className="max-h-8 object-contain" />
                  ) : (
                    <span
                      className="font-mono text-[11px] tracking-[2px] uppercase"
                      style={{ color: briefing.brandColorPrimary ?? "#000000" }}
                    >
                      {briefing.brandNameDisplay || briefing.clientName}
                    </span>
                  )}
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: briefing.brandColorPrimary ?? "#000000" }} />
                    <div className="w-4 h-4 rounded-full border" style={{ borderColor: briefing.brandColorPrimary ?? "#000000", backgroundColor: briefing.brandColorSecondary ?? "#ffffff" }} />
                  </div>
                </div>
                <div className="px-5 py-4">
                  {briefing.openingMessage && (
                    <p className="font-sans text-[11px] leading-relaxed" style={{ color: briefing.brandColorPrimary ?? "#000000", opacity: 0.6 }}>
                      {briefing.openingMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Responses */}
        {activeTab === "responses" && (
          <div className="space-y-6">
            {responses.length === 0 ? (
              <p className="font-mono text-[10px] text-[#333] uppercase">Nenhuma resposta ainda</p>
            ) : (
              responses.map((r, idx) => (
                <div key={r.id} className="border-b border-[#0f0f0f] pb-6">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-[9px] text-[#333] min-w-[24px] mt-1">{String(idx + 1).padStart(2, "0")}</span>
                    <div className="flex-1">
                      <p className="font-mono text-[10px] text-[#555] mb-3 leading-relaxed">{r.questionText}</p>
                      <p className="font-sans text-[13px] text-[#aaa] leading-relaxed whitespace-pre-wrap">{r.answer}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Analysis */}
        {activeTab === "analysis" && (
          <div>
            {!briefing.aiSummary ? (
              <div className="text-center py-16">
                <p className="font-mono text-[9px] tracking-[3px] text-[#333] uppercase mb-6">
                  {briefing.status === "answered"
                    ? "ANÁLISE AINDA NÃO GERADA"
                    : "AGUARDANDO RESPOSTAS DO CLIENTE"}
                </p>
                {briefing.status === "answered" && (
                  <button
                    onClick={() => generateAnalysisMutation.mutate({ id })}
                    disabled={generateAnalysisMutation.isPending}
                    className="font-mono text-[9px] tracking-[2px] uppercase px-6 py-3 bg-white text-black hover:opacity-85 disabled:opacity-50 transition-opacity"
                  >
                    {generateAnalysisMutation.isPending ? "ANALISANDO..." : "GERAR ANÁLISE IA"}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div>
                    <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">RESUMO EXECUTIVO</p>
                    <div className="font-sans text-[13px] text-[#888] leading-relaxed">
                      <Streamdown>{briefing.aiSummary}</Streamdown>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">CONCEITO CRIATIVO</p>
                    <div className="font-sans text-[13px] text-[#888] leading-relaxed">
                      <Streamdown>{briefing.aiConcept ?? ""}</Streamdown>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">PRÓXIMOS PASSOS</p>
                  <div className="font-sans text-[13px] text-[#888] leading-relaxed">
                    <Streamdown>{briefing.aiNextSteps ?? ""}</Streamdown>
                  </div>
                  {briefing.aiGeneratedAt && (
                    <p className="font-mono text-[8px] text-[#222] mt-6">
                      Gerado em {new Date(briefing.aiGeneratedAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                  <button
                    onClick={() => generateAnalysisMutation.mutate({ id })}
                    disabled={generateAnalysisMutation.isPending}
                    className="font-mono text-[8px] tracking-[2px] uppercase text-[#333] hover:text-[#555] transition-colors mt-4"
                  >
                    {generateAnalysisMutation.isPending ? "REGENERANDO..." : "↺ REGENERAR"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Followup */}
        {activeTab === "followup" && (
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-4">PERGUNTAS DE ACOMPANHAMENTO</p>
              {followups.length === 0 ? (
                <p className="font-mono text-[10px] text-[#222] italic mb-6">Nenhuma pergunta de acompanhamento ainda</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {followups.map((f) => (
                    <div key={f.id} className="border border-[#111] p-4">
                      <p className="font-mono text-[10px] text-[#555] mb-2">{f.question}</p>
                      {f.answer ? (
                        <p className="font-sans text-[12px] text-[#888] leading-relaxed">{f.answer}</p>
                      ) : (
                        <span className="font-mono text-[8px] tracking-[1px] uppercase text-[#BA7517]">AGUARDANDO RESPOSTA</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {briefing.status !== "archived" && (
                <div className="border-t border-[#111] pt-6">
                  <p className="font-mono text-[8px] tracking-[3px] text-[#333] uppercase mb-3">NOVA PERGUNTA</p>
                  <div className="flex gap-3">
                    <input
                      value={followupQuestion}
                      onChange={(e) => setFollowupQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && followupQuestion.trim()) {
                          addFollowupMutation.mutate({ briefingId: id, question: followupQuestion });
                        }
                      }}
                      placeholder="Digite uma pergunta de acompanhamento..."
                      className="flex-1 bg-transparent border-b border-[#1a1a1a] text-white font-mono text-[12px] py-2 outline-none focus:border-[#444] placeholder:text-[#222] transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (followupQuestion.trim()) {
                          addFollowupMutation.mutate({ briefingId: id, question: followupQuestion });
                        }
                      }}
                      disabled={!followupQuestion.trim() || addFollowupMutation.isPending}
                      className="font-mono text-[9px] tracking-[2px] uppercase px-4 py-2 bg-white text-black hover:opacity-85 disabled:opacity-30 transition-opacity"
                    >
                      ENVIAR
                    </button>
                  </div>
                  <p className="font-mono text-[8px] text-[#222] mt-2">
                    O cliente receberá um link para responder as perguntas pendentes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
