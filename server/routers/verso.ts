import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM, Message } from "../_core/llm";
import {
  getBrandVoice,
  upsertBrandVoice,
  getVersoLibrary,
  saveVersoText,
  updateVersoText,
  deleteVersoText,
} from "../db-verso";

// ─── Template definitions ─────────────────────────────────────────────────────

type BrandVoiceData = {
  brandName: string;
  brandDesc?: string | null;
  persona?: string | null;
  toneKeywords?: string[] | null;
  toneAvoid?: string[] | null;
  exampleText?: string | null;
};

function buildSystemPrompt(
  templateId: string,
  fields: Record<string, string>,
  voice: BrandVoiceData | null
): string {
  const voiceBlock = voice
    ? `\nTOM DE VOZ DA MARCA:\nMarca: ${voice.brandName}\n${voice.brandDesc ? `Descrição: ${voice.brandDesc}\n` : ""}${voice.persona ? `Persona: ${voice.persona}\n` : ""}${voice.toneKeywords?.length ? `Tom: ${voice.toneKeywords.join(", ")}\n` : ""}${voice.toneAvoid?.length ? `Evitar: ${voice.toneAvoid.join(", ")}\n` : ""}${voice.exampleText ? `Exemplo de texto da marca: "${voice.exampleText}"\n` : ""}`
    : "";

  switch (templateId) {
    case "social-caption":
      return `Você é um redator criativo especialista em copy para redes sociais.${voiceBlock}

Escreva uma caption para ${fields.plataforma} sobre: ${fields.assunto}
${fields.cta ? `Call to action: ${fields.cta}` : ""}
${fields.hashtags === "Sim" ? "Inclua 5-8 hashtags relevantes ao final." : "Não inclua hashtags."}

Escreva no mesmo idioma da descrição do post.
Retorne APENAS o texto da caption, sem explicações.`.trim();

    case "social-carrossel":
      return `Você é um redator especialista em carrosséis para redes sociais.${voiceBlock ? `\n${voiceBlock}` : ""}

Crie um roteiro de carrossel com ${fields.slides} slides sobre: ${fields.tema}
Formato de cada slide: ${fields.formato}

Estrutura obrigatória:
- Slide 1: gancho (faz o usuário querer deslizar)
- Slides 2 ao ${parseInt(fields.slides) - 1}: conteúdo
- Slide final: CTA ou conclusão

Escreva no mesmo idioma do tema.
Retorne APENAS o roteiro estruturado, sem comentários.`.trim();

    case "pub-headline":
      return `Você é um redator publicitário sênior especialista em copy de impacto.${voiceBlock ? `\n${voiceBlock}` : ""}

Crie ${fields.variações} opções de headline + tagline para: ${fields.produto}
Benefício/emoção central: ${fields.beneficio}

Formato de cada opção:
HEADLINE: [título principal]
TAGLINE: [subtítulo complementar]

Escreva no mesmo idioma do briefing.
Retorne APENAS as opções numeradas, sem comentários.`.trim();

    case "pub-anuncio":
      return `Você é especialista em copy para anúncios pagos digitais.${voiceBlock ? `\n${voiceBlock}` : ""}

Escreva copy de anúncio para ${fields.plataforma}:
Produto/oferta: ${fields.produto}
Público: ${fields.publico}
Objetivo: ${fields.objetivo}

Inclua:
- Headline principal (máx 30 caracteres para Google, até 60 para Meta)
- Texto principal
- CTA claro

Escreva no mesmo idioma do briefing.
Retorne APENAS o copy estruturado.`.trim();

    case "pptx-slide-title":
      return `Você é especialista em comunicação executiva e apresentações profissionais.${voiceBlock ? `\n${voiceBlock}` : ""}

Crie 3 opções de título + subtítulo para um slide que comunica:
${fields.conteudo}
Contexto: ${fields.contexto}

Formato:
TÍTULO: [impactante, até 8 palavras]
SUBTÍTULO: [complementar, até 15 palavras]

Escreva no mesmo idioma do briefing.
Retorne APENAS as 3 opções numeradas.`.trim();

    case "pptx-abertura":
      return `Você é especialista em storytelling para apresentações executivas.${voiceBlock ? `\n${voiceBlock}` : ""}

Escreva um parágrafo de abertura para uma apresentação sobre: ${fields.tema}
Audiência: ${fields.audiencia}
Objetivo final: ${fields.objetivo}

O texto deve: capturar atenção imediatamente, estabelecer credibilidade, criar expectativa para o que vem a seguir.
Máximo de 80 palavras.

Escreva no mesmo idioma do briefing.
Retorne APENAS o texto, sem comentários.`.trim();

    case "email-disparo":
      return `Você é especialista em email marketing e copywriting de CRM.${voiceBlock ? `\n${voiceBlock}` : ""}

Escreva um email de ${fields.objetivo} com:
Assunto: ${fields.assunto_email}
Mensagem central: ${fields.mensagem}
CTA: ${fields.cta}

Estrutura:
- Linha de assunto (já fornecida)
- Pré-header (máx 90 caracteres)
- Saudação
- Corpo do email (2-3 parágrafos curtos)
- CTA em destaque
- Assinatura

Escreva no mesmo idioma do briefing.
Retorne APENAS o email completo estruturado.`.trim();

    case "email-assunto":
      return `Você é especialista em email marketing com foco em taxas de abertura.${voiceBlock ? `\n${voiceBlock}` : ""}

Crie ${fields.quantidade} opções de linha de assunto de email para o contexto:
${fields.contexto}

Varie os estilos entre: curiosidade, urgência, personalização, benefício direto, pergunta.
Máximo de 50 caracteres por linha de assunto.

Escreva no mesmo idioma do contexto.
Retorne APENAS as opções numeradas, sem comentários.`.trim();

    default:
      throw new TRPCError({ code: "BAD_REQUEST", message: "Template inválido" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const versoRouter = router({
  // Brand Voice
  getBrandVoice: protectedProcedure.query(async ({ ctx }) => {
    return getBrandVoice(ctx.user.id);
  }),

  saveBrandVoice: protectedProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(100),
        brandDesc: z.string().max(500).optional(),
        persona: z.string().max(300).optional(),
        toneKeywords: z.array(z.string()).max(10).optional(),
        toneAvoid: z.array(z.string()).max(10).optional(),
        exampleText: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return upsertBrandVoice(ctx.user.id, input);
    }),

  // Generate text
  generate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        fields: z.record(z.string(), z.string()),
        useVoice: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const voice = input.useVoice ? await getBrandVoice(ctx.user.id) : null;
      const prompt = buildSystemPrompt(input.templateId, input.fields, voice);

      const messages: Message[] = [{ role: "user", content: prompt }];
      const response = await invokeLLM({ messages });

      const raw = response.choices?.[0]?.message?.content;
      const content = typeof raw === "string" ? raw : "Erro ao gerar texto.";
      return { content };
    }),

  // Refine text
  refine: protectedProcedure
    .input(
      z.object({
        originalText: z.string(),
        instruction: z.string().min(1).max(500),
        templateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const voice = await getBrandVoice(ctx.user.id);
      const voiceBlock = voice
        ? `\nTOM DE VOZ: ${voice.brandName} — ${voice.toneKeywords?.join(", ")}. Evitar: ${voice.toneAvoid?.join(", ")}.`
        : "";

      const refinePrompt = `Você é um redator especialista em refinamento de textos.${voiceBlock}\n\nTexto original:\n\"\"\"\n${input.originalText}\n\"\"\"\n\nInstrução de refinamento: ${input.instruction}\n\nAplique a instrução mantendo o estilo e propósito original.\nRetorne APENAS o texto refinado, sem comentários.`;
      const messages: Message[] = [{ role: "user", content: refinePrompt }];
      const response = await invokeLLM({ messages });

      const raw = response.choices?.[0]?.message?.content;
      const content = typeof raw === "string" ? raw : "Erro ao refinar texto.";
      return { content };
    }),

  // Library
  getLibrary: protectedProcedure.query(async ({ ctx }) => {
    return getVersoLibrary(ctx.user.id);
  }),

  saveText: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        category: z.string(),
        templateId: z.string(),
        content: z.string(),
        toneSnapshot: z.record(z.string(), z.unknown()).optional(),
        inputFields: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return saveVersoText(ctx.user.id, {
        ...input,
        toneSnapshot: input.toneSnapshot as Record<string, unknown> | undefined,
        inputFields: input.inputFields as Record<string, unknown> | undefined,
      });
    }),

  updateText: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().max(200).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateVersoText(ctx.user.id, id, data);
      return { ok: true };
    }),

  deleteText: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteVersoText(ctx.user.id, input.id);
      return { ok: true };
    }),
});
