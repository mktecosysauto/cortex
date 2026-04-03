import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock fetch globally ──────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth logout ──────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: { name: string; opts: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, opts: Record<string, unknown>) => {
          clearedCookies.push({ name, opts });
        },
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.opts).toMatchObject({ maxAge: -1 });
  });
});

// ─── Anthropic proxy ──────────────────────────────────────────────────────────
describe("anthropic.messages", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("proxies request to Anthropic API and returns response", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        id: "msg_123",
        content: [{ type: "text", text: "Updated prompt" }],
      }),
    });

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.anthropic.messages({
      apiKey: "sk-ant-test",
      model: "claude-opus-4-5",
      maxTokens: 100,
      system: "You are a prompt editor.",
      messages: [{ role: "user", content: "Edit this prompt" }],
    });

    expect(result).toMatchObject({ id: "msg_123" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "sk-ant-test" }),
      })
    );
  });

  it("includes system prompt when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ content: [{ type: "text", text: "result" }] }),
    });

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.anthropic.messages({
      apiKey: "sk-ant-test",
      system: "System instructions",
      messages: [{ role: "user", content: "Hello" }],
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toBe("System instructions");
  });
});

// ─── Freepik proxy ────────────────────────────────────────────────────────────
describe("freepik.improvePrompt", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns improved prompt directly when no task_id", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ prompt: "Improved prompt text" }),
    });

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.freepik.improvePrompt({
      apiKey: "fp_test",
      prompt: "Original prompt",
    });

    expect(result).toMatchObject({ prompt: "Improved prompt text" });
  });

  it("polls task when task_id is returned", async () => {
    // First call: returns task_id
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ task_id: "task_abc123" }),
    });
    // Poll call: returns DONE
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: "DONE", prompt: "Polled improved prompt" }),
    });

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.freepik.improvePrompt({
      apiKey: "fp_test",
      prompt: "Original prompt",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ prompt: "Polled improved prompt" });
  });
});

describe("freepik.generateImage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends correct payload to Mystic endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ images: [{ url: "https://cdn.freepik.com/img.jpg" }] }),
    });

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.freepik.generateImage({
      apiKey: "fp_test",
      prompt: "A car on a road",
      aspectRatio: "3:4",
      realism: true,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.aspect_ratio).toBe("3:4");
    expect(body.realism).toBe(true);
    expect(mockFetch.mock.calls[0][0]).toContain("/v1/ai/mystic");
  });
});
