import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ─── Proxy helpers ────────────────────────────────────────────────────────────
async function proxyAnthropicRequest(body: Record<string, unknown>, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function proxyFreepikRequest(endpoint: string, body: Record<string, unknown>, apiKey: string) {
  const res = await fetch(`https://api.freepik.com${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-freepik-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function pollFreepikTask(taskUrl: string, apiKey: string, maxMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(taskUrl, {
      headers: { "x-freepik-api-key": apiKey },
    });
    const data = await res.json();
    const status = data.data?.status || data.status;
    if (status === "DONE" || status === "completed") return data.data || data;
    if (status === "FAILED" || status === "failed") throw new Error("Task failed");
  }
  throw new Error("Timeout");
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Anthropic Proxy ─────────────────────────────────────────────────────────
  anthropic: router({
    /**
     * Improve or edit a prompt using Claude.
     * Accepts the full messages array and system prompt from the client.
     */
    messages: publicProcedure
      .input(
        z.object({
          apiKey: z.string().min(1),
          model: z.string().default("claude-opus-4-5"),
          maxTokens: z.number().default(1000),
          system: z.string().optional(),
          messages: z.array(
            z.object({
              role: z.enum(["user", "assistant"] as [string, ...string[]]),
              content: z.union([
                z.string(),
                z.array(z.record(z.string(), z.unknown())),
              ]),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const body: Record<string, unknown> = {
          model: input.model,
          max_tokens: input.maxTokens,
          messages: input.messages,
        };
        if (input.system) body.system = input.system;
        return proxyAnthropicRequest(body, input.apiKey);
      }),
  }),

  // ── Freepik Proxy ────────────────────────────────────────────────────────────
  freepik: router({
    /**
     * Improve a prompt via Freepik AI.
     */
    improvePrompt: publicProcedure
      .input(z.object({ apiKey: z.string().min(1), prompt: z.string() }))
      .mutation(async ({ input }) => {
        const data = await proxyFreepikRequest(
          "/v1/ai/improve-prompt",
          { prompt: input.prompt },
          input.apiKey
        );
        const taskId = data.data?.task_id || data.task_id;
        if (taskId) {
          return pollFreepikTask(
            `https://api.freepik.com/v1/ai/improve-prompt/${taskId}`,
            input.apiKey
          );
        }
        return data;
      }),

    /**
     * Generate an image via Freepik Mystic.
     */
    generateImage: publicProcedure
      .input(
        z.object({
          apiKey: z.string().min(1),
          prompt: z.string(),
          aspectRatio: z.string().default("3:4"),
          realism: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        const data = await proxyFreepikRequest(
          "/v1/ai/mystic",
          { prompt: input.prompt, aspect_ratio: input.aspectRatio, realism: input.realism },
          input.apiKey
        );
        const taskId = data.data?.task_id || data.task_id;
        if (taskId) {
          return pollFreepikTask(
            `https://api.freepik.com/v1/ai/mystic/${taskId}`,
            input.apiKey
          );
        }
        return data;
      }),

    /**
     * Upscale an image via Freepik AI.
     */
    upscaleImage: publicProcedure
      .input(z.object({ apiKey: z.string().min(1), imageBase64: z.string() }))
      .mutation(async ({ input }) => {
        const data = await proxyFreepikRequest(
          "/v1/ai/image-upscaler",
          { image: input.imageBase64 },
          input.apiKey
        );
        const taskId = data.data?.task_id || data.task_id;
        if (taskId) {
          return pollFreepikTask(
            `https://api.freepik.com/v1/ai/image-upscaler/${taskId}`,
            input.apiKey
          );
        }
        return data;
      }),

    /**
     * Animate an image via Freepik Kling.
     */
    animateImage: publicProcedure
      .input(
        z.object({
          apiKey: z.string().min(1),
          imageBase64: z.string(),
          prompt: z.string(),
          duration: z.number().default(5),
          aspectRatio: z.string().default("3:4"),
        })
      )
      .mutation(async ({ input }) => {
        const data = await proxyFreepikRequest(
          "/v1/ai/image-to-video/kling-v2-5-pro",
          {
            image: input.imageBase64,
            prompt: input.prompt,
            duration: input.duration,
            aspect_ratio: input.aspectRatio,
          },
          input.apiKey
        );
        const taskId = data.data?.task_id || data.task_id;
        if (taskId) {
          return pollFreepikTask(
            `https://api.freepik.com/v1/ai/image-to-video/kling-v2-5-pro/${taskId}`,
            input.apiKey,
            240000
          );
        }
        return data;
      }),
  }),
});

export type AppRouter = typeof appRouter;
