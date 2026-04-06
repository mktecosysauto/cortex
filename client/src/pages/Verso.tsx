import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useNexus } from "@/contexts/NexusContext";
import { toast } from "sonner";

// ─── Template definitions ─────────────────────────────────────────────────────

type FieldDef = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  maxlength?: number;
  rows?: number;
  options?: string[];
};

type Template = {
  id: string;
  category: string;
  name: string;
  desc: string;
  icon: string;
  fields: FieldDef[];
};

const TEMPLATES: Template[] = [
  {
    id: "social-caption",
    category: "Redes Sociais",
    name: "Caption",
    desc: "Legenda para post no Instagram, LinkedIn ou Facebook",
    icon: "◈",
    fields: [
      { id: "assunto", label: "Sobre o que é o post?", type: "textarea", rows: 2, maxlength: 300, placeholder: "ex: lançamento do novo modelo SUV da concessionária" },
      { id: "plataforma", label: "Plataforma", type: "select", options: ["Instagram", "LinkedIn", "Facebook"] },
      { id: "cta", label: "Call to action (opcional)", type: "text", maxlength: 100, placeholder: "ex: Agende seu test drive" },
      { id: "hashtags", label: "Incluir hashtags?", type: "select", options: ["Sim", "Não"] },
    ],
  },
  {
    id: "social-carrossel",
    category: "Redes Sociais",
    name: "Carrossel",
    desc: "Roteiro de slides para carrossel no Instagram ou LinkedIn",
    icon: "◈",
    fields: [
      { id: "tema", label: "Tema do carrossel", type: "textarea", rows: 2, maxlength: 300, placeholder: "ex: 5 sinais de que você precisa trocar seu carro" },
      { id: "slides", label: "Número de slides", type: "select", options: ["5", "7", "10"] },
      { id: "formato", label: "Formato de cada slide", type: "select", options: ["Título + 2 linhas", "Título + bullets", "Só título de impacto"] },
    ],
  },
  {
    id: "pub-headline",
    category: "Publicidade",
    name: "Headline + Tagline",
    desc: "Título e subtítulo de campanha publicitária",
    icon: "◆",
    fields: [
      { id: "produto", label: "Produto ou serviço", type: "text", maxlength: 100, placeholder: "ex: SUV elétrico premium" },
      { id: "beneficio", label: "Principal benefício ou emoção", type: "text", maxlength: 150, placeholder: "ex: liberdade sem limites, status, economia" },
      { id: "variações", label: "Quantas opções gerar", type: "select", options: ["3", "5", "7"] },
    ],
  },
  {
    id: "pub-anuncio",
    category: "Publicidade",
    name: "Anúncio (Meta/Google)",
    desc: "Copy completo para anúncio pago",
    icon: "◆",
    fields: [
      { id: "produto", label: "O que está sendo anunciado", type: "text", maxlength: 100, placeholder: "ex: test drive gratuito do novo Corolla" },
      { id: "publico", label: "Público-alvo do anúncio", type: "text", maxlength: 150, placeholder: "ex: homens 35-50 anos, classe A/B" },
      { id: "plataforma", label: "Plataforma", type: "select", options: ["Meta Ads (Facebook/Instagram)", "Google Ads", "Ambos"] },
      { id: "objetivo", label: "Objetivo do anúncio", type: "select", options: ["Gerar lead", "Vender", "Gerar visita à loja", "Awareness de marca"] },
    ],
  },
  {
    id: "pptx-slide-title",
    category: "Apresentações",
    name: "Título de slide",
    desc: "Título e subtítulo impactantes para um slide",
    icon: "▣",
    fields: [
      { id: "conteudo", label: "O que o slide comunica", type: "textarea", rows: 2, maxlength: 300, placeholder: "ex: nossos resultados de vendas cresceram 40% em Q3" },
      { id: "contexto", label: "Contexto da apresentação", type: "text", maxlength: 150, placeholder: "ex: pitch para investidores, reunião de diretoria" },
    ],
  },
  {
    id: "pptx-abertura",
    category: "Apresentações",
    name: "Texto de abertura",
    desc: "Parágrafo de abertura para apresentação ou pitch",
    icon: "▣",
    fields: [
      { id: "tema", label: "Tema da apresentação", type: "text", maxlength: 150, placeholder: "ex: proposta de parceria comercial" },
      { id: "audiencia", label: "Quem vai ouvir", type: "text", maxlength: 150, placeholder: "ex: diretores de marketing de concessionárias" },
      { id: "objetivo", label: "O que você quer que eles façam", type: "text", maxlength: 150, placeholder: "ex: assinar um contrato, aprovar o orçamento" },
    ],
  },
  {
    id: "email-disparo",
    category: "Email / CRM",
    name: "Email de disparo",
    desc: "Email completo para base de leads ou clientes",
    icon: "◉",
    fields: [
      { id: "assunto_email", label: "Assunto do email", type: "text", maxlength: 100, placeholder: "ex: oferta especial para troca do seu veículo" },
      { id: "objetivo", label: "Objetivo do email", type: "select", options: ["Oferta/promoção", "Nutrição de lead", "Reativação", "Pós-venda", "Convite para evento"] },
      { id: "mensagem", label: "O que comunicar", type: "textarea", rows: 3, maxlength: 400, placeholder: "ex: desconto de 10% para quem agendar test drive em janeiro" },
      { id: "cta", label: "Call to action", type: "text", maxlength: 80, placeholder: "ex: Agendar meu test drive" },
    ],
  },
  {
    id: "email-assunto",
    category: "Email / CRM",
    name: "Linhas de assunto",
    desc: "Variações de subject line para testes A/B",
    icon: "◉",
    fields: [
      { id: "contexto", label: "Contexto do email", type: "textarea", rows: 2, maxlength: 300, placeholder: "ex: email de retomada para clientes inativos há 6 meses, oferta de revisão gratuita" },
      { id: "quantidade", label: "Quantidade de opções", type: "select", options: ["5", "8", "10"] },
    ],
  },
];

const CATEGORIES = ["Redes Sociais", "Publicidade", "Apresentações", "Email / CRM"];
const CATEGORY_ICONS: Record<string, string> = {
  "Redes Sociais": "◈",
  "Publicidade": "◆",
  "Apresentações": "▣",
  "Email / CRM": "◉",
};

// ─── Brand Voice Modal ────────────────────────────────────────────────────────

function BrandVoiceModal({
  onClose,
  initialData,
  onSaved,
}: {
  onClose: () => void;
  initialData: {
    brandName?: string | null;
    brandDesc?: string | null;
    persona?: string | null;
    toneKeywords?: string[] | null;
    toneAvoid?: string[] | null;
    exampleText?: string | null;
  } | null;
  onSaved: () => void;
}) {
  const [brandName, setBrandName] = useState(initialData?.brandName ?? "");
  const [brandDesc, setBrandDesc] = useState(initialData?.brandDesc ?? "");
  const [persona, setPersona] = useState(initialData?.persona ?? "");
  const [toneKeywords, setToneKeywords] = useState((initialData?.toneKeywords ?? []).join(", "));
  const [toneAvoid, setToneAvoid] = useState((initialData?.toneAvoid ?? []).join(", "));
  const [exampleText, setExampleText] = useState(initialData?.exampleText ?? "");

  const saveMutation = trpc.verso.saveBrandVoice.useMutation({
    onSuccess: () => { onSaved(); onClose(); },
  });

  const handleSave = () => {
    if (!brandName.trim()) return;
    saveMutation.mutate({
      brandName: brandName.trim(),
      brandDesc: brandDesc.trim() || undefined,
      persona: persona.trim() || undefined,
      toneKeywords: toneKeywords.split(",").map(s => s.trim()).filter(Boolean),
      toneAvoid: toneAvoid.split(",").map(s => s.trim()).filter(Boolean),
      exampleText: exampleText.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white text-lg">✕</button>
        <div className="mb-6">
          <p className="text-white/40 text-xs tracking-[0.2em] mb-1">VERSO</p>
          <h2 className="font-['Bebas_Neue'] text-3xl text-white tracking-wider">TOM DE VOZ</h2>
          <p className="text-white/50 text-sm mt-1">Configure a identidade da sua marca para personalizar todos os textos gerados.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-white/50 text-xs tracking-[0.15em] mb-1">NOME DA MARCA *</label>
            <input value={brandName} onChange={e => setBrandName(e.target.value)} maxLength={100} className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" placeholder="ex: Ecosys Auto" />
          </div>
          <div>
            <label className="block text-white/50 text-xs tracking-[0.15em] mb-1">DESCRIÇÃO DA MARCA</label>
            <textarea value={brandDesc} onChange={e => setBrandDesc(e.target.value)} rows={2} maxLength={500} className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none" placeholder="ex: concessionária multimarcas premium em São Paulo" />
          </div>
          <div>
            <label className="block text-white/50 text-xs tracking-[0.15em] mb-1">PERSONA DO CLIENTE</label>
            <input value={persona} onChange={e => setPersona(e.target.value)} maxLength={300} className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" placeholder="ex: executivos 35-55 anos, valorizam status e praticidade" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs tracking-[0.15em] mb-1">TOM (separado por vírgula)</label>
              <input value={toneKeywords} onChange={e => setToneKeywords(e.target.value)} className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" placeholder="ex: sofisticado, direto, confiante" />
            </div>
            <div>
              <label className="block text-white/50 text-xs tracking-[0.15em] mb-1">EVITAR (separado por vírgula)</label>
              <input value={toneAvoid} onChange={e => setToneAvoid(e.target.value)} className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" placeholder="ex: gírias, informalidade excessiva" />
            </div>
          </div>
          <div>
            <label className="block text-white/50 text-xs tracking-[0.15em] mb-1">EXEMPLO DE TEXTO DA MARCA (opcional)</label>
            <textarea value={exampleText} onChange={e => setExampleText(e.target.value)} rows={3} maxLength={1000} className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none" placeholder="Cole um exemplo de texto que representa bem o tom da marca..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-white/20 py-2 text-white/60 text-xs tracking-[0.15em] hover:border-white/40 hover:text-white transition-colors">CANCELAR</button>
          <button onClick={handleSave} disabled={!brandName.trim() || saveMutation.isPending} className="flex-1 bg-white text-black py-2 text-xs tracking-[0.15em] font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
            {saveMutation.isPending ? "SALVANDO..." : "SALVAR TOM DE VOZ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Verso() {
  const { user } = useAuth();
  const { addXP } = useNexus();
  const [activeCategory, setActiveCategory] = useState("Redes Sociais");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [useVoice, setUseVoice] = useState(true);
  const [generatedText, setGeneratedText] = useState("");
  const [savedTextId, setSavedTextId] = useState<number | null>(null);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [showRefine, setShowRefine] = useState(false);
  const [activeTab, setActiveTab] = useState<"generator" | "library">("generator");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const { data: brandVoice, refetch: refetchVoice } = trpc.verso.getBrandVoice.useQuery(undefined, { enabled: !!user });
  const { data: library, refetch: refetchLibrary } = trpc.verso.getLibrary.useQuery(undefined, { enabled: !!user && activeTab === "library" });

  const generateMutation = trpc.verso.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedText(data.content);
      setSavedTextId(null);
      setShowRefine(false);
      addXP("verso_generate", false);
      toast.success("+30 XP · Texto gerado!", { duration: 2500 });
    },
  });

  const refineMutation = trpc.verso.refine.useMutation({
    onSuccess: (data) => {
      setGeneratedText(data.content);
      setSavedTextId(null);
      setRefineInstruction("");
      setShowRefine(false);
      addXP("verso_refine", false);
    },
  });
  const saveTextMutation = trpc.verso.saveText.useMutation({
    onSuccess: (data) => {
      if (data) setSavedTextId(data.id);
      refetchLibrary();
      addXP("verso_save", false);
      toast.success("+5 XP · Texto salvo na biblioteca!", { duration: 2000 });
    },
  });
  const deleteTextMutation = trpc.verso.deleteText.useMutation({
    onSuccess: () => refetchLibrary(),
  });

  const selectTemplate = useCallback((tpl: Template) => {
    setActiveTemplate(tpl);
    const initial: Record<string, string> = {};
    tpl.fields.forEach(f => {
      initial[f.id] = f.options ? f.options[0] : "";
    });
    setFields(initial);
    setGeneratedText("");
    setSavedTextId(null);
    setShowRefine(false);
  }, []);

  const handleGenerate = () => {
    if (!activeTemplate) return;
    generateMutation.mutate({
      templateId: activeTemplate.id,
      fields,
      useVoice,
    });
  };

  const handleRefine = () => {
    if (!activeTemplate || !generatedText || !refineInstruction.trim()) return;
    refineMutation.mutate({
      originalText: generatedText,
      instruction: refineInstruction,
      templateId: activeTemplate.id,
    });
  };

  const handleSave = () => {
    if (!activeTemplate || !generatedText) return;
    saveTextMutation.mutate({
      title: fields[activeTemplate.fields[0]?.id]?.slice(0, 60) || activeTemplate.name,
      category: activeTemplate.category,
      templateId: activeTemplate.id,
      content: generatedText,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const filteredTemplates = TEMPLATES.filter(t => t.category === activeCategory);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="font-['Bebas_Neue'] text-4xl text-white tracking-wider mb-4">VERSO</p>
          <p className="text-white/50 mb-6">Faça login para acessar o gerador de copy.</p>
          <a href={getLoginUrl()} className="border border-white/30 px-6 py-2 text-white/70 text-xs tracking-[0.2em] hover:border-white hover:text-white transition-colors">ENTRAR</a>
        </div>
      </div>
    );
  }

   return (
    <div className="min-h-screen bg-black text-white" style={{ animation: "pageRevealFade 0.4s ease both", paddingTop: 56 }}>
      <GlobalHeader currentPage="verso" />
      {showVoiceModal && (
        <BrandVoiceModal
          onClose={() => setShowVoiceModal(false)}
          initialData={brandVoice ?? null}
          onSaved={() => refetchVoice()}
        />
      )}
      {/* Sub-header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between" style={{ position: "sticky", top: 56, zIndex: 100, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-white/30 text-xs tracking-[0.2em]">CÓRTEX</p>
            <h1 className="font-['Bebas_Neue'] text-3xl tracking-wider leading-none">VERSO</h1>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <p className="text-white/40 text-sm">Gerador de copy e textos criativos</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Brand Voice chip */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex items-center gap-2 border border-white/20 px-3 py-1.5 text-xs tracking-[0.1em] hover:border-white/40 transition-colors"
          >
            <span className="text-white/40">TOM:</span>
            <span className={brandVoice ? "text-white" : "text-white/30"}>
              {brandVoice ? brandVoice.brandName.toUpperCase() : "NÃO CONFIGURADO"}
            </span>
            <span className="text-white/30">✎</span>
          </button>
          {/* Tabs */}
          <div className="flex border border-white/20">
            <button
              onClick={() => setActiveTab("generator")}
              className={`px-4 py-1.5 text-xs tracking-[0.1em] transition-colors ${activeTab === "generator" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
            >
              GERADOR
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`px-4 py-1.5 text-xs tracking-[0.1em] transition-colors ${activeTab === "library" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
            >
              BIBLIOTECA {library && library.length > 0 && `(${library.length})`}
            </button>
          </div>
        </div>
      </div>

      {activeTab === "generator" ? (
        <div className="flex h-[calc(100vh-129px)]">
          {/* Sidebar — Categories + Templates */}
          <div className="w-64 border-r border-white/10 flex flex-col overflow-hidden">
            {/* Category tabs */}
            <div className="border-b border-white/10">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setActiveTemplate(null); setGeneratedText(""); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs tracking-[0.1em] transition-colors border-l-2 ${activeCategory === cat ? "border-white text-white bg-white/5" : "border-transparent text-white/40 hover:text-white/70"}`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{cat.toUpperCase()}</span>
                </button>
              ))}
            </div>
            {/* Template list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredTemplates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  className={`w-full text-left p-3 border transition-colors ${activeTemplate?.id === tpl.id ? "border-white/40 bg-white/5" : "border-white/10 hover:border-white/20 hover:bg-white/3"}`}
                >
                  <p className="text-xs tracking-[0.1em] text-white font-medium">{tpl.name.toUpperCase()}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Form panel */}
            <div className="w-80 border-r border-white/10 flex flex-col overflow-hidden">
              {activeTemplate ? (
                <>
                  <div className="p-5 border-b border-white/10">
                    <p className="text-white/40 text-xs tracking-[0.15em]">{activeTemplate.category.toUpperCase()}</p>
                    <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider mt-0.5">{activeTemplate.name.toUpperCase()}</h2>
                    <p className="text-white/40 text-xs mt-1">{activeTemplate.desc}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {activeTemplate.fields.map(field => (
                      <div key={field.id}>
                        <label className="block text-white/50 text-xs tracking-[0.12em] mb-1.5">{field.label.toUpperCase()}</label>
                        {field.type === "textarea" ? (
                          <textarea
                            value={fields[field.id] ?? ""}
                            onChange={e => setFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                            rows={field.rows ?? 3}
                            maxLength={field.maxlength}
                            placeholder={field.placeholder}
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none placeholder:text-white/20"
                          />
                        ) : field.type === "select" ? (
                          <select
                            value={fields[field.id] ?? field.options?.[0] ?? ""}
                            onChange={e => setFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                          >
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={fields[field.id] ?? ""}
                            onChange={e => setFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                            maxLength={field.maxlength}
                            placeholder={field.placeholder}
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-white/20"
                          />
                        )}
                      </div>
                    ))}

                    {/* Voice toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <p className="text-xs tracking-[0.1em] text-white/60">USAR TOM DE VOZ</p>
                        {!brandVoice && <p className="text-xs text-white/30 mt-0.5">Não configurado</p>}
                      </div>
                      <button
                        onClick={() => setUseVoice(v => !v)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${useVoice && brandVoice ? "bg-white" : "bg-white/20"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${useVoice && brandVoice ? "left-5" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 border-t border-white/10">
                    <button
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      className="w-full bg-white text-black py-3 text-xs tracking-[0.2em] font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                    >
                      {generateMutation.isPending ? "GERANDO..." : "→ GERAR TEXTO"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                  <div>
                    <p className="text-white/20 text-4xl mb-3">{CATEGORY_ICONS[activeCategory]}</p>
                    <p className="text-white/30 text-xs tracking-[0.15em]">SELECIONE UM TEMPLATE</p>
                    <p className="text-white/20 text-xs mt-1">para começar a gerar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Result panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {generatedText ? (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <p className="text-white/40 text-xs tracking-[0.15em]">RESULTADO</p>
                    <div className="flex items-center gap-2">
                      {savedTextId ? (
                        <span className="text-white/30 text-xs tracking-[0.1em]">✓ SALVO</span>
                      ) : (
                        <button
                          onClick={handleSave}
                          disabled={saveTextMutation.isPending}
                          className="border border-white/20 px-3 py-1 text-xs tracking-[0.1em] text-white/60 hover:border-white/40 hover:text-white transition-colors disabled:opacity-50"
                        >
                          {saveTextMutation.isPending ? "..." : "SALVAR"}
                        </button>
                      )}
                      <button
                        onClick={handleCopy}
                        className="border border-white/20 px-3 py-1 text-xs tracking-[0.1em] text-white/60 hover:border-white/40 hover:text-white transition-colors"
                      >
                        {copyFeedback ? "✓ COPIADO" : "COPIAR"}
                      </button>
                      <button
                        onClick={() => setShowRefine(v => !v)}
                        className={`border px-3 py-1 text-xs tracking-[0.1em] transition-colors ${showRefine ? "border-white text-white" : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"}`}
                      >
                        REFINAR
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Streamdown>{generatedText}</Streamdown>
                    </div>
                  </div>

                  {showRefine && (
                    <div className="border-t border-white/10 p-4">
                      <p className="text-white/40 text-xs tracking-[0.12em] mb-2">INSTRUÇÃO DE REFINAMENTO</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={refineInstruction}
                          onChange={e => setRefineInstruction(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleRefine()}
                          placeholder="ex: torne mais formal, adicione urgência, reduza para metade..."
                          maxLength={500}
                          className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-white/20"
                        />
                        <button
                          onClick={handleRefine}
                          disabled={refineMutation.isPending || !refineInstruction.trim()}
                          className="bg-white text-black px-4 py-2 text-xs tracking-[0.1em] hover:bg-white/90 transition-colors disabled:opacity-50"
                        >
                          {refineMutation.isPending ? "..." : "→"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    {generateMutation.isPending ? (
                      <>
                        <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/30 text-xs tracking-[0.2em]">GERANDO TEXTO...</p>
                      </>
                    ) : (
                      <>
                        <p className="text-white/10 text-6xl mb-4">◈</p>
                        <p className="text-white/20 text-xs tracking-[0.2em]">O TEXTO GERADO APARECERÁ AQUI</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Library tab */
        <div className="p-6">
          {!library || library.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-white/10 text-6xl mb-4">◈</p>
              <p className="text-white/30 text-xs tracking-[0.2em] mb-2">BIBLIOTECA VAZIA</p>
              <p className="text-white/20 text-xs">Gere textos e salve-os para acessar aqui.</p>
              <button onClick={() => setActiveTab("generator")} className="mt-6 border border-white/20 px-4 py-2 text-xs tracking-[0.15em] text-white/50 hover:border-white/40 hover:text-white transition-colors">
                → ABRIR GERADOR
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {library.map(item => (
                <div key={item.id} className="border border-white/10 p-5 hover:border-white/20 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white/30 text-xs tracking-[0.1em]">{item.category.toUpperCase()}</p>
                      <p className="text-white text-sm font-medium mt-0.5 line-clamp-1">{item.title}</p>
                    </div>
                    <button
                      onClick={() => deleteTextMutation.mutate({ id: item.id })}
                      className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs ml-2 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed line-clamp-4">{item.content}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <p className="text-white/20 text-xs">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(item.content); }}
                      className="text-white/30 text-xs tracking-[0.1em] hover:text-white transition-colors"
                    >
                      COPIAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
