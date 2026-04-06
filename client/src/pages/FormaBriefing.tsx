import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";

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

// ─── All questions flat (loaded from bank) ────────────────────────────────────
function getAllQuestionsFlat(bank: QuestionsBank): Question[] {
  return Object.values(bank).flat();
}

function getQuestionFromBank(id: string, bank: QuestionsBank): Question | null {
  if (id.startsWith("custom_")) {
    try {
      const obj = JSON.parse(decodeURIComponent(id.replace("custom_", "")));
      return { id: obj.id ?? id, text: obj.text ?? id, type: obj.type ?? "textarea", required: obj.required ?? false };
    } catch {
      return null;
    }
  }
  return getAllQuestionsFlat(bank).find((q) => q.id === id) ?? null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FormaBriefing() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const { data: questionsBank } = trpc.forma.getQuestionsBank.useQuery();
  const { data: briefing, isLoading, error } = trpc.forma.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const submitMutation = trpc.forma.submitResponses.useMutation();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [followupAnswers, setFollowupAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error2, setError2] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Focus input on question change
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentIdx]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        const q = currentQuestion;
        if (q?.type !== "textarea") {
          e.preventDefault();
          handleNext();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="font-mono text-[11px] text-gray-400 uppercase tracking-widest">Carregando...</p>
      </div>
    );
  }

  if (error || !briefing) {
    const msg = (error as { message?: string })?.message;
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-6">
          <p className="font-mono text-[11px] text-gray-400 uppercase tracking-widest mb-4">
            {msg === "already_answered"
              ? "Este briefing já foi respondido."
              : msg === "not_sent"
              ? "Este link ainda não está ativo."
              : "Link inválido ou expirado."}
          </p>
        </div>
      </div>
    );
  }

  const primary = briefing.brandColorPrimary ?? "#000000";
  const secondary = briefing.brandColorSecondary ?? "#ffffff";

  // Build questions list
  const allQuestions: Question[] = briefing.questionIds
    .map((id) => (questionsBank ? getQuestionFromBank(id, questionsBank as QuestionsBank) : null))
    .filter(Boolean) as Question[];

  // Add pending followups at the end
  const followupQuestions = briefing.pendingFollowups ?? [];
  const totalSteps = allQuestions.length + followupQuestions.length;
  const isFollowupPhase = currentIdx >= allQuestions.length;
  const followupIdx = currentIdx - allQuestions.length;

  const currentQuestion = !isFollowupPhase ? allQuestions[currentIdx] : null;
  const currentFollowup = isFollowupPhase ? followupQuestions[followupIdx] : null;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? ""
    : currentFollowup
    ? followupAnswers[currentFollowup.id] ?? ""
    : "";

  const progress = totalSteps > 0 ? ((currentIdx) / totalSteps) * 100 : 0;

  function handleNext() {
    if (currentIdx < totalSteps - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }

  function setCurrentAnswer(val: string) {
    if (currentQuestion) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
    } else if (currentFollowup) {
      setFollowupAnswers((prev) => ({ ...prev, [currentFollowup.id]: val }));
    }
  }

  async function handleSubmit() {
    const responsesPayload = allQuestions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id] ?? "",
      }));

    const followupPayload = followupQuestions
      .filter((f) => followupAnswers[f.id]?.trim())
      .map((f) => ({
        followupId: f.id,
        answer: followupAnswers[f.id] ?? "",
      }));

    try {
      await submitMutation.mutateAsync({
        token,
        responses: responsesPayload,
        followupAnswers: followupPayload,
      });
      setSubmitted(true);
    } catch (e) {
      setError2("Erro ao enviar respostas. Tente novamente.");
    }
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: secondary }}
      >
        <div className="max-w-md">
          {briefing.brandLogoUrl && (
            <img src={briefing.brandLogoUrl} alt="Logo" className="max-h-10 object-contain mx-auto mb-8" />
          )}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl"
            style={{ backgroundColor: primary, color: secondary }}
          >
            ✓
          </div>
          <h2 className="font-serif text-2xl mb-4" style={{ color: primary }}>
            Obrigado pelas suas respostas!
          </h2>
          <p className="font-sans text-[14px] leading-relaxed" style={{ color: primary, opacity: 0.7 }}>
            {briefing.closingMessage || "Suas respostas foram recebidas com sucesso. Entraremos em contato em breve."}
          </p>
        </div>
      </div>
    );
  }

  const canProceed = !currentQuestion?.required || (currentAnswer.trim().length > 0);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: secondary }}
    >
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: `${primary}15` }}
      >
        {briefing.brandLogoUrl ? (
          <img src={briefing.brandLogoUrl} alt="Logo" className="max-h-8 object-contain" />
        ) : (
          <span
            className="font-mono text-[12px] tracking-[3px] uppercase"
            style={{ color: primary }}
          >
            {briefing.brandNameDisplay || "BRIEFING"}
          </span>
        )}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px]" style={{ color: primary, opacity: 0.4 }}>
            {currentIdx + 1} / {totalSteps}
          </span>
          <div className="w-24 h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: `${primary}15` }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: primary }}
            />
          </div>
        </div>
      </header>

      {/* Question area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        {/* Opening message (only on first question) */}
        {currentIdx === 0 && briefing.openingMessage && (
          <p
            className="font-sans text-[13px] leading-relaxed mb-8 text-center max-w-lg"
            style={{ color: primary, opacity: 0.6 }}
          >
            {briefing.openingMessage}
          </p>
        )}

        {/* Question */}
        <div className="w-full">
          <div className="flex items-start gap-3 mb-6">
            <span
              className="font-mono text-[11px] mt-1 min-w-[24px]"
              style={{ color: primary, opacity: 0.3 }}
            >
              {String(currentIdx + 1).padStart(2, "0")}
            </span>
            <p
              className="font-serif text-[22px] leading-snug"
              style={{ color: primary }}
            >
              {currentQuestion?.text ?? currentFollowup?.question ?? ""}
              {(currentQuestion?.required) && (
                <span style={{ color: primary, opacity: 0.4 }}> *</span>
              )}
            </p>
          </div>

          {/* Hint */}
          {currentQuestion?.hint && (
            <p
              className="font-mono text-[11px] mb-4 ml-9"
              style={{ color: primary, opacity: 0.4 }}
            >
              {currentQuestion.hint}
            </p>
          )}

          {/* Input */}
          <div className="ml-9">
            {currentQuestion?.type === "radio" && currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setCurrentAnswer(opt);
                      setTimeout(handleNext, 300);
                    }}
                    className="w-full text-left px-4 py-3 border transition-all duration-150 font-sans text-[14px]"
                    style={{
                      borderColor: currentAnswer === opt ? primary : `${primary}20`,
                      backgroundColor: currentAnswer === opt ? `${primary}10` : "transparent",
                      color: primary,
                    }}
                  >
                    <span
                      className="inline-block w-5 h-5 border rounded-full mr-3 align-middle"
                      style={{
                        borderColor: currentAnswer === opt ? primary : `${primary}30`,
                        backgroundColor: currentAnswer === opt ? primary : "transparent",
                      }}
                    />
                    {opt}
                  </button>
                ))}
              </div>
            ) : currentQuestion?.type === "textarea" || isFollowupPhase ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                rows={4}
                placeholder="Digite sua resposta aqui..."
                className="w-full bg-transparent border-b-2 py-3 font-sans text-[16px] outline-none resize-none placeholder:opacity-20 transition-colors"
                style={{
                  borderColor: currentAnswer ? primary : `${primary}20`,
                  color: primary,
                }}
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={currentQuestion?.type === "email" ? "email" : "text"}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Digite sua resposta..."
                className="w-full bg-transparent border-b-2 py-3 font-sans text-[16px] outline-none placeholder:opacity-20 transition-colors"
                style={{
                  borderColor: currentAnswer ? primary : `${primary}20`,
                  color: primary,
                }}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 mt-8 ml-9">
            {currentQuestion?.type !== "radio" && (
              <button
                onClick={handleNext}
                disabled={!canProceed || submitMutation.isPending}
                className="px-6 py-3 font-sans text-[13px] font-medium transition-opacity disabled:opacity-30"
                style={{ backgroundColor: primary, color: secondary }}
              >
                {currentIdx === totalSteps - 1
                  ? submitMutation.isPending
                    ? "Enviando..."
                    : "Enviar respostas"
                  : "Continuar →"}
              </button>
            )}
            {currentIdx > 0 && (
              <button
                onClick={handleBack}
                className="font-mono text-[11px] uppercase tracking-widest transition-opacity"
                style={{ color: primary, opacity: 0.4 }}
              >
                ← Voltar
              </button>
            )}
            {currentQuestion?.type !== "radio" && (
              <span
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: primary, opacity: 0.25 }}
              >
                Pressione Enter ↵
              </span>
            )}
          </div>

          {error2 && (
            <p className="font-mono text-[11px] text-red-500 mt-4 ml-9">{error2}</p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 text-center">
        <span
          className="font-mono text-[9px] uppercase tracking-widest"
          style={{ color: primary, opacity: 0.2 }}
        >
          Powered by CÓRTEX
        </span>
      </footer>
    </div>
  );
}
