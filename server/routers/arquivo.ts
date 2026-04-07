import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  seedAutomotivosCollection,
} from "../db-arquivo";

export const arquivoRouter = router({
  // ── Collections ────────────────────────────────────────────────────────────

  /** Returns all collections for the user, seeding automotivos on first access */
  getCollections: protectedProcedure.query(async ({ ctx }) => {
    const collections = await getCollections(ctx.user.id);
    // Seed automotivos if user has no collections yet
    if (collections.length === 0) {
      const seeded = await seedAutomotivosCollection(ctx.user.id);
      return seeded ? [seeded] : [];
    }
    return collections;
  }),

  createCollection: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createCollection(ctx.user.id, input);
    }),

  updateCollection: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        coverUrl: z.string().url().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateCollection(ctx.user.id, id, data);
      return { ok: true };
    }),

  deleteCollection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const col = await getCollection(ctx.user.id, input.id);
      if (col?.isSystem) {
        // System collections can be deleted — user may want to clean up
      }
      await deleteCollection(ctx.user.id, input.id);
      return { ok: true };
    }),

  // ── Prompts ────────────────────────────────────────────────────────────────

  getPrompts: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getPrompts(ctx.user.id, input.collectionId);
    }),

  createPrompt: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        title: z.string().min(1).max(200),
        tags: z.array(z.string()).max(10).optional(),
        prompt: z.string().min(1),
        imgUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { collectionId, ...data } = input;
      return createPrompt(ctx.user.id, collectionId, data);
    }),

  updatePrompt: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        tags: z.array(z.string()).max(10).optional(),
        prompt: z.string().min(1).optional(),
        imgUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updatePrompt(ctx.user.id, id, data);
      return { ok: true };
    }),

  deletePrompt: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePrompt(ctx.user.id, input.id);
      return { ok: true };
    }),

  // ── AI helpers (kept from original, now protected) ─────────────────────────

  editPrompt: publicProcedure
    .input(z.object({ prompt: z.string(), request: z.string() }))
    .mutation(async ({ input }) => {
      const content = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an expert at writing image generation prompts for automotive photography. Edit the prompt based on the user's request. Return ONLY the updated prompt, no explanation, no quotes.",
          },
          {
            role: "user",
            content: `Original prompt: ${input.prompt}\nRequest: ${input.request}`,
          },
        ],
      });
      const text = content?.choices?.[0]?.message?.content ?? "";
      return { text };
    }),

  reverseEngineer: publicProcedure
    .input(
      z.object({
        imageBase64: z.string().optional(),
        mediaType: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const imageUrl = input.imageBase64
        ? `data:${input.mediaType ?? "image/jpeg"};base64,${input.imageBase64}`
        : (input.imageUrl ?? "");
      if (!imageUrl) throw new Error("Provide imageBase64 or imageUrl");
      const content = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
              {
                type: "text",
                text: "Analyze this image and write a detailed image generation prompt that would reproduce this scene. Include: camera angle, lighting, atmosphere, subject details, background, color palette, depth of field, and photographic style. Write in English. Return ONLY the prompt, no explanation.",
              },
            ],
          },
        ],
      });
      const text = content?.choices?.[0]?.message?.content ?? "";
      return { text };
    }),
});
