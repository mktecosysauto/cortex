import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import {
  listBriefings,
  getBriefing,
  getBriefingByToken,
  createBriefing,
  updateBriefing,
  updateBriefingByToken,
  deleteBriefing,
  getResponses,
  saveResponses,
  getFollowups,
  createFollowup,
  answerFollowup,
  getAttachments,
  createAttachment,
  deleteAttachment,
} from "../db-forma";
import { storagePut } from "../storage";
import { sendBriefingEmail } from "../email";

// ─── Banco de perguntas ────────────────────────────────────────────────────────
export const FORMA_QUESTIONS_BANK = {
  identidade_visual: [
    { id: "iv_01", text: "Como você descreveria a personalidade da sua marca em três palavras?", type: "textarea", hint: "Ex: moderna, acolhedora, ousada", required: true },
    { id: "iv_02", text: "Se a sua marca fosse uma pessoa, como ela seria? Descreva sua personalidade, estilo e comportamento.", type: "textarea", hint: "", required: true },
    { id: "iv_03", text: "Quem é o público-alvo da sua marca? Descreva o perfil ideal do seu cliente.", type: "textarea", hint: "Idade, profissão, estilo de vida, valores...", required: true },
    { id: "iv_04", text: "Quais marcas ou identidades visuais você admira? O que te atrai nelas?", type: "textarea", hint: "Pode ser de qualquer setor", required: false },
    { id: "iv_05", text: "Há alguma referência visual que você definitivamente não quer? Algo que deve ser evitado?", type: "textarea", hint: "", required: false },
    { id: "iv_06", text: "Qual é a principal mensagem que sua marca precisa transmitir visualmente?", type: "textarea", hint: "", required: true },
    { id: "iv_07", text: "Você tem preferência por alguma paleta de cores? Há cores que representam sua marca?", type: "textarea", hint: "", required: false },
    { id: "iv_08", text: "Onde a identidade visual será aplicada principalmente?", type: "radio", options: ["Redes sociais", "Materiais impressos", "Site/digital", "Embalagens", "Todos os anteriores"], required: true },
  ],
  naming: [
    { id: "nm_01", text: "Qual é o segmento de atuação da empresa ou produto?", type: "textarea", hint: "", required: true },
    { id: "nm_02", text: "Quais valores ou conceitos o nome deve transmitir?", type: "textarea", hint: "Ex: confiança, inovação, proximidade, sofisticação", required: true },
    { id: "nm_03", text: "Você prefere um nome em português, inglês, ou está aberto a outras línguas?", type: "radio", options: ["Português", "Inglês", "Sem preferência", "Outra língua"], required: true },
    { id: "nm_04", text: "Há algum nome que você já considerou? O que gostou ou não gostou nele?", type: "textarea", hint: "", required: false },
    { id: "nm_05", text: "Quais nomes de concorrentes você conhece? Quer se diferenciar ou se aproximar do padrão do setor?", type: "textarea", hint: "", required: false },
    { id: "nm_06", text: "O nome será usado como domínio de site? Há restrições de caracteres ou comprimento?", type: "radio", options: ["Sim, precisa ser um domínio viável", "Não necessariamente", "Ainda não sei"], required: true },
  ],
  campanha: [
    { id: "cp_01", text: "Qual é o objetivo principal desta campanha?", type: "radio", options: ["Lançamento de produto/serviço", "Aumento de vendas", "Reconhecimento de marca", "Retenção de clientes", "Captação de leads"], required: true },
    { id: "cp_02", text: "Qual é o produto ou serviço que será promovido? Descreva brevemente.", type: "textarea", hint: "", required: true },
    { id: "cp_03", text: "Qual é o público-alvo desta campanha?", type: "textarea", hint: "Seja específico: idade, interesses, comportamento de compra", required: true },
    { id: "cp_04", text: "Quais canais serão usados na campanha?", type: "radio", options: ["Redes sociais", "Google Ads", "Email marketing", "Mídia impressa", "Combinação de canais"], required: true },
    { id: "cp_05", text: "Qual é o orçamento estimado para a campanha?", type: "radio", options: ["Até R$1.000", "R$1.000 a R$5.000", "R$5.000 a R$20.000", "Acima de R$20.000", "Prefiro não informar"], required: false },
    { id: "cp_06", text: "Qual é o prazo para a campanha entrar no ar?", type: "text", hint: "", required: true },
  ],
  social_media: [
    { id: "sm_01", text: "Em quais redes sociais sua marca está ou quer estar presente?", type: "radio", options: ["Instagram", "LinkedIn", "TikTok", "Facebook", "Múltiplas redes"], required: true },
    { id: "sm_02", text: "Qual é o objetivo principal das suas redes sociais?", type: "radio", options: ["Vender", "Construir comunidade", "Gerar leads", "Posicionar a marca", "Educar o público"], required: true },
    { id: "sm_03", text: "Com que frequência você quer publicar?", type: "radio", options: ["1x por semana", "3x por semana", "Diariamente", "Quando houver conteúdo relevante"], required: true },
    { id: "sm_04", text: "Você já tem um banco de imagens ou precisa de orientação sobre produção de conteúdo visual?", type: "radio", options: ["Tenho banco de imagens próprio", "Uso banco de imagens gratuito", "Preciso de orientação sobre produção", "Não tenho nada ainda"], required: true },
    { id: "sm_05", text: "Há algum perfil de referência (do seu setor ou não) que você admira nas redes sociais?", type: "textarea", hint: "Pode incluir o @ do perfil", required: false },
  ],
  publicidade: [
    { id: "pb_01", text: "Qual é o produto ou serviço a ser anunciado?", type: "textarea", hint: "", required: true },
    { id: "pb_02", text: "Qual é o principal diferencial do que você oferece?", type: "textarea", hint: "", required: true },
    { id: "pb_03", text: "Qual é a principal objeção do seu cliente na hora de comprar?", type: "textarea", hint: "", required: true },
    { id: "pb_04", text: "Qual é o tom desejado para a comunicação?", type: "radio", options: ["Emocional", "Racional/informativo", "Humorístico", "Urgente/escassez", "Aspiracional"], required: true },
    { id: "pb_05", text: "Qual é o call-to-action desejado?", type: "text", hint: "Ex: 'Compre agora', 'Saiba mais', 'Agende uma consulta'", required: true },
  ],
  email_marketing: [
    { id: "em_01", text: "Qual é o objetivo principal dos seus emails?", type: "radio", options: ["Vender produtos/serviços", "Nutrir leads", "Fidelizar clientes", "Informar e educar", "Reativar clientes inativos", "Lançamentos"], required: true },
    { id: "em_02", text: "Com que frequência você quer se comunicar com sua base?", type: "radio", options: ["1x por semana", "2x por semana", "1x por mês", "Somente em datas especiais", "Fluxos automatizados (não recorrente)"], required: true },
    { id: "em_03", text: "Qual ferramenta de email marketing você utiliza atualmente?", type: "text", hint: "ex: Mailchimp, RD Station, ActiveCampaign, Klaviyo...", required: false },
    { id: "em_04", text: "Você tem uma base de leads existente? Qual o tamanho aproximado?", type: "radio", options: ["Ainda não tenho base", "Até 1.000 contatos", "1.000 a 10.000", "Mais de 10.000"], required: true },
  ],
  universal: [
    { id: "un_01", text: "O que motivou você a buscar este serviço agora?", type: "textarea", hint: "", required: true },
    { id: "un_02", text: "Qual seria o resultado ideal para você ao final deste projeto?", type: "textarea", hint: "", required: true },
    { id: "un_03", text: "Existe algum prazo importante para a entrega ou lançamento?", type: "text", hint: "", required: false },
    { id: "un_04", text: "Há algo que tentou antes que não funcionou? O que aprendeu disso?", type: "textarea", hint: "", required: false },
    { id: "un_05", text: "Existe alguma informação importante sobre o projeto que não foi perguntada acima?", type: "textarea", hint: "", required: false },
  ],
};

// ─── AI Analysis ──────────────────────────────────────────────────────────────
async function generateAIAnalysis(
  briefing: { title: string; projectType: string; clientName: string },
  responses: { questionText: string; answer: string }[]
) {
  const responsesText = responses
    .map((r) => `P: ${r.questionText}\nR: ${r.answer}`)
    .join("\n\n");

  const prompt = `Você é um consultor criativo especializado em branding e comunicação.
Analise o seguinte briefing de projeto e gere uma análise estruturada.

PROJETO: ${briefing.title}
TIPO: ${briefing.projectType}
CLIENTE: ${briefing.clientName}

RESPOSTAS DO BRIEFING:
${responsesText}

Gere uma análise em JSON com exatamente estas três chaves:
- "summary": Um resumo executivo do briefing em 2-3 parágrafos, destacando os pontos mais importantes sobre o cliente, seus objetivos e contexto.
- "concept": Um rascunho de conceito criativo com 2-3 direções possíveis para o projeto, cada uma com nome e descrição breve.
- "nextSteps": Uma lista de 4-6 próximos passos recomendados para o profissional, em ordem de prioridade.

Responda APENAS com o JSON válido, sem markdown ou texto adicional.`;

  const result = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "briefing_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            concept: { type: "string" },
            nextSteps: { type: "string" },
          },
          required: ["summary", "concept", "nextSteps"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = result?.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new Error("No AI response");

  try {
    return JSON.parse(content) as { summary: string; concept: string; nextSteps: string };
  } catch {
    return { summary: content, concept: "", nextSteps: "" };
  }
}

// ─── AI Form Suggestion ─────────────────────────────────────────────────────
async function generateFormSuggestion(description: string) {
  // Build a flat list of all question IDs and texts for the AI to choose from
  const allIds = Object.entries(FORMA_QUESTIONS_BANK).flatMap(([, qs]) =>
    qs.map((q) => `${q.id}: ${q.text}`)
  );

  const projectTypes = [
    "identidade_visual", "naming", "campanha", "social_media",
    "publicidade", "email_marketing", "fotografia", "video", "web", "outro"
  ];

  const prompt = `Você é um assistente especializado em criação de briefings criativos.
O profissional de design descreveu o que precisa saber do cliente:

"${description}"

Com base nessa descrição, gere:
1. Um título curto e profissional para o projeto (máx. 60 caracteres)
2. O tipo de projeto mais adequado (escolha UM da lista: ${projectTypes.join(", ")})
3. Uma lista de IDs de perguntas do banco abaixo que melhor atendem à necessidade descrita (escolha entre 5 e 12 perguntas, priorizando as mais relevantes)

BANCO DE PERGUNTAS DISPONÍVEIS:
${allIds.join("\n")}

Responda APENAS com JSON válido no formato:
{
  "title": "string",
  "projectType": "string",
  "questionIds": ["id1", "id2", ...]
}`;

  const result = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "form_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            projectType: { type: "string" },
            questionIds: { type: "array", items: { type: "string" } },
          },
          required: ["title", "projectType", "questionIds"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = result?.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new Error("No AI response");
  return JSON.parse(content) as { title: string; projectType: string; questionIds: string[] };
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const formaRouter = router({
  // List all briefings for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return listBriefings(ctx.user.id);
  }),

  // Get a single briefing (with responses and followups)
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const briefing = await getBriefing(input.id, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      const responses = await getResponses(input.id);
      const followups = await getFollowups(input.id);
      return { briefing, responses, followups };
    }),

  // Create a new briefing
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        projectType: z.string().min(1),
        clientName: z.string().min(1),
        clientEmail: z.string().min(1),
        brandColorPrimary: z.string().optional(),
        brandColorSecondary: z.string().optional(),
        brandNameDisplay: z.string().optional(),
        brandLogoUrl: z.string().optional(),
        openingMessage: z.string().optional(),
        closingMessage: z.string().optional(),
        questionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createBriefing({ userId: ctx.user.id, ...input });
      return result;
    }),

  // Update a briefing
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        projectType: z.string().optional(),
        clientName: z.string().optional(),
        clientEmail: z.string().min(1).optional(),
        brandColorPrimary: z.string().optional(),
        brandColorSecondary: z.string().optional(),
        brandNameDisplay: z.string().nullable().optional(),
        brandLogoUrl: z.string().nullable().optional(),
        openingMessage: z.string().nullable().optional(),
        closingMessage: z.string().nullable().optional(),
        questionIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateBriefing(id, ctx.user.id, data);
      return { ok: true };
    }),

  // Delete a briefing
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteBriefing(input.id, ctx.user.id);
      return { ok: true };
    }),

  // Send briefing to client (mark as sent + send email)
  send: protectedProcedure
    .input(z.object({ id: z.number(), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const briefing = await getBriefing(input.id, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      await updateBriefing(input.id, ctx.user.id, { status: "sent", sentAt: new Date() });
      const formLink = `${input.origin}/b/${briefing.publicToken}`;
      const emailResult = await sendBriefingEmail({
        clientEmail: briefing.clientEmail,
        clientName: briefing.clientName,
        projectName: briefing.title,
        senderName: ctx.user.name ?? "CÓRTEX",
        formLink,
        brandColor: briefing.brandColorPrimary ?? undefined,
        brandLogoUrl: briefing.brandLogoUrl ?? undefined,
        customMessage: briefing.openingMessage ?? undefined,
      });
      return { ok: true, token: briefing.publicToken, emailSent: emailResult.ok, emailError: emailResult.error };
    }),

  // Resend briefing email
  resend: protectedProcedure
    .input(z.object({ id: z.number(), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const briefing = await getBriefing(input.id, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      const formLink = `${input.origin}/b/${briefing.publicToken}`;
      const emailResult = await sendBriefingEmail({
        clientEmail: briefing.clientEmail,
        clientName: briefing.clientName,
        projectName: briefing.title,
        senderName: ctx.user.name ?? "CÓRTEX",
        formLink,
        brandColor: briefing.brandColorPrimary ?? undefined,
        brandLogoUrl: briefing.brandLogoUrl ?? undefined,
        customMessage: briefing.openingMessage ?? undefined,
      });
      return { ok: true, emailSent: emailResult.ok, emailError: emailResult.error };
    }),

  // Archive a briefing
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await updateBriefing(input.id, ctx.user.id, { status: "archived" });
      return { ok: true };
    }),

  // Get the questions bank (public - needed for client form)
  getQuestionsBank: publicProcedure.query(() => {
    return FORMA_QUESTIONS_BANK;
  }),

  // AI: Generate form suggestion from a free-text description
  suggestForm: protectedProcedure
    .input(z.object({ description: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const suggestion = await generateFormSuggestion(input.description);
      // Filter questionIds to only valid ones from the bank
      const validIds = new Set(
        Object.values(FORMA_QUESTIONS_BANK).flatMap((qs) => qs.map((q) => q.id))
      );
      const filteredIds = suggestion.questionIds.filter((id) => validIds.has(id));
      return { ...suggestion, questionIds: filteredIds };
    }),

  // Generate AI analysis for a briefing
  generateAnalysis: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const briefing = await getBriefing(input.id, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      const responses = await getResponses(input.id);
      if (responses.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No responses yet" });

      const analysis = await generateAIAnalysis(briefing, responses);
      await updateBriefing(input.id, ctx.user.id, {
        aiSummary: analysis.summary,
        aiConcept: analysis.concept,
        aiNextSteps: analysis.nextSteps,
        aiGeneratedAt: new Date(),
      });
      return analysis;
    }),

  // Add a followup question
  addFollowup: protectedProcedure
    .input(z.object({ briefingId: z.number(), question: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const briefing = await getBriefing(input.briefingId, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      const id = await createFollowup(input.briefingId, input.question);
      return { id };
    }),

  // Upload logo for branding
  uploadLogo: protectedProcedure
    .input(z.object({ briefingId: z.number(), fileBase64: z.string(), mimeType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const briefing = await getBriefing(input.briefingId, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });

      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.mimeType.split("/")[1] || "png";
      const key = `forma-logos/${ctx.user.id}-${input.briefingId}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      await updateBriefing(input.briefingId, ctx.user.id, { brandLogoUrl: url });
      return { url };
    }),

  // ─── Public endpoints (no auth required) ─────────────────────────────────

  // Get briefing by public token (for client form)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const briefing = await getBriefingByToken(input.token);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      if (briefing.status !== "sent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: briefing.status === "answered" ? "already_answered" : "not_sent" });
      }
      // Return only public fields + followups
      const followups = await getFollowups(briefing.id);
      const pendingFollowups = followups.filter((f) => f.status === "pending");
      return {
        id: briefing.id,
        title: briefing.title,
        clientName: briefing.clientName,
        brandLogoUrl: briefing.brandLogoUrl,
        brandColorPrimary: briefing.brandColorPrimary,
        brandColorSecondary: briefing.brandColorSecondary,
        brandNameDisplay: briefing.brandNameDisplay,
        openingMessage: briefing.openingMessage,
        closingMessage: briefing.closingMessage,
        questionIds: briefing.questionIds,
        pendingFollowups,
      };
    }),

  // Submit client responses
  submitResponses: publicProcedure
    .input(
      z.object({
        token: z.string(),
        responses: z.array(
          z.object({
            questionId: z.string(),
            questionText: z.string(),
            answer: z.string(),
          })
        ),
        followupAnswers: z.array(
          z.object({
            followupId: z.number(),
            answer: z.string(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const briefing = await getBriefingByToken(input.token);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      if (briefing.status !== "sent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Briefing already answered or not sent" });
      }

      // Save responses
      const validResponses = input.responses.filter((r) => r.answer.trim() !== "");
      await saveResponses(briefing.id, validResponses);

      // Save followup answers
      if (input.followupAnswers && input.followupAnswers.length > 0) {
        for (const fa of input.followupAnswers) {
          if (fa.answer.trim()) {
            await answerFollowup(fa.followupId, briefing.id, fa.answer);
          }
        }
      }

      // Update briefing status
      await updateBriefingByToken(input.token, {
        status: "answered",
        answeredAt: new Date(),
      });

      // Trigger AI analysis in background (fire and forget)
      generateAIAnalysis(briefing, validResponses)
        .then(async (analysis) => {
          // We need to get the briefing again to update with userId
          const updated = await getBriefingByToken(input.token);
          if (updated) {
            await updateBriefing(updated.id, updated.userId, {
              aiSummary: analysis.summary,
              aiConcept: analysis.concept,
              aiNextSteps: analysis.nextSteps,
              aiGeneratedAt: new Date(),
            });
          }
        })
        .catch(console.error);

      return { ok: true };
    }),

  // Answer a followup question (client side)
  answerFollowup: publicProcedure
    .input(z.object({ token: z.string(), followupId: z.number(), answer: z.string() }))
    .mutation(async ({ input }) => {
      const briefing = await getBriefingByToken(input.token);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      await answerFollowup(input.followupId, briefing.id, input.answer);
      return { ok: true };
    }),

  // Upload a file attachment (public form — token-based)
  uploadAttachment: publicProcedure
    .input(z.object({
      token: z.string(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      size: z.number(),
    }))
    .mutation(async ({ input }) => {
      const briefing = await getBriefingByToken(input.token);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.size > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo muito grande. Limite: 10MB" });
      const ext = input.fileName.split(".").pop() ?? "bin";
      const fileKey = `forma/${briefing.id}/attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(input.fileBase64, "base64");
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const id = await createAttachment({
        briefingId: briefing.id,
        type: "file",
        name: input.fileName,
        url,
        fileKey,
        mimeType: input.mimeType,
        size: input.size,
      });
      return { id, url, name: input.fileName };
    }),

  // Add a URL attachment (public form — token-based)
  addUrlAttachment: publicProcedure
    .input(z.object({
      token: z.string(),
      url: z.string().url(),
      name: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const briefing = await getBriefingByToken(input.token);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      const name = input.name?.trim() || input.url;
      const id = await createAttachment({
        briefingId: briefing.id,
        type: "url",
        name,
        url: input.url,
      });
      return { id, url: input.url, name };
    }),

  // Get attachments for a briefing (authenticated — owner only)
  getAttachments: protectedProcedure
    .input(z.object({ briefingId: z.number() }))
    .query(async ({ input, ctx }) => {
      const briefing = await getBriefing(input.briefingId, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      return getAttachments(input.briefingId);
    }),

  // Delete an attachment (authenticated — owner only)
  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.number(), briefingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const briefing = await getBriefing(input.briefingId, ctx.user.id);
      if (!briefing) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteAttachment(input.id, input.briefingId);
      return { ok: true };
    }),
});
