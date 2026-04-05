import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import {
  adminResetUser,
  getAllUsers,
  getLeaderboard,
  getSessionsInRange,
  getSessionsLast30Days,
  getSystemStats,
  getToolEventsInRange,
  getUserProfile,
  getWeeklyInsight,
  saveSession,
  saveToolEvent,
  saveWeeklyInsight,
  updateUserNexus,
} from "../db-cortex";

// ─── Nexus Profile ────────────────────────────────────────────────────────────
const nexusRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return profile;
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      agentName: z.string().max(64).optional(),
      agentAppearance: z.object({
        paletteId: z.string().nullable(),
        silhouetteId: z.string().nullable(),
        effectId: z.string().nullable(),
        titleId: z.string().nullable(),
      }).optional(),
      xp: z.number().int().min(0).optional(),
      glifos: z.number().int().min(0).optional(),
      rankId: z.number().int().min(1).max(7).optional(),
      purchases: z.array(z.string()).optional(),
      showInRanking: z.boolean().optional(),
      sprintGoalHours: z.number().int().nullable().optional(),
      sprintStartDate: z.date().nullable().optional(),
      goalDailyMin: z.number().int().min(0).optional(),
      goalWeeklyMin: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateUserNexus(ctx.user.id, input);
      return { success: true };
    }),

  saveSession: protectedProcedure
    .input(z.object({
      startedAt: z.date(),
      completedAt: z.date().optional(),
      durationMin: z.number().int(),
      status: z.enum(["completed", "abandoned", "paused"]),
      taskName: z.string().optional(),
      toolActive: z.string().optional(),
      xpEarned: z.number().int(),
      glifosEarned: z.number().int(),
      wasFocused: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await saveSession({ userId: ctx.user.id, ...input });
      return { success: true };
    }),

  saveToolEvent: protectedProcedure
    .input(z.object({
      tool: z.string(),
      eventType: z.string(),
      xpEarned: z.number().int(),
      glifosEarned: z.number().int(),
      wasFocused: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await saveToolEvent({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
const dashboardRouter = router({
  getWeekData: protectedProcedure
    .input(z.object({
      weekStart: z.date(),
      weekEnd: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const sessions = await getSessionsInRange(ctx.user.id, input.weekStart, input.weekEnd);
      const toolEvents = await getToolEventsInRange(ctx.user.id, input.weekStart, input.weekEnd);

      const completed = sessions.filter(s => s.status === "completed");
      const abandoned = sessions.filter(s => s.status === "abandoned");

      const focusMinutes = completed.reduce((sum, s) => sum + s.durationMin, 0);
      const xpEarned = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
      const glifosEarned = sessions.reduce((sum, s) => sum + s.glifosEarned, 0);

      // Daily breakdown
      const dailyMap: Record<string, number> = {};
      completed.forEach(s => {
        const day = s.startedAt.toISOString().split("T")[0]!;
        dailyMap[day] = (dailyMap[day] ?? 0) + s.durationMin;
      });
      const dailyBreakdown = Object.entries(dailyMap)
        .map(([date, minutes]) => ({ date, minutes }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Best day
      const bestDay = dailyBreakdown.reduce((best, d) => d.minutes > (best?.minutes ?? 0) ? d : best, dailyBreakdown[0] ?? null);

      // Tool breakdown
      const toolMap: Record<string, number> = {};
      completed.forEach(s => {
        if (s.toolActive) toolMap[s.toolActive] = (toolMap[s.toolActive] ?? 0) + s.durationMin;
      });
      const toolBreakdown = Object.entries(toolMap).map(([tool, minutes]) => ({ tool, minutes }));

      // Tool event counts
      const promptsEdited = toolEvents.filter(e => e.eventType === "prompt_editado").length;
      const imagesGenerated = toolEvents.filter(e => e.eventType === "imagem_gerada").length;
      const imagesSaved = toolEvents.filter(e => e.eventType === "imagem_salva").length;

      return {
        focusMinutes,
        sessionsDone: completed.length,
        sessionsAbandoned: abandoned.length,
        xpEarned,
        glifosEarned,
        bestDay: bestDay?.date ?? null,
        dailyBreakdown,
        toolBreakdown,
        promptsEdited,
        imagesGenerated,
        imagesSaved,
        sessions: sessions.map(s => ({
          id: s.id,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          durationMin: s.durationMin,
          status: s.status,
          taskName: s.taskName,
          toolActive: s.toolActive,
          xpEarned: s.xpEarned,
        })),
      };
    }),

  getLast30Days: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await getSessionsLast30Days(ctx.user.id);
    const completed = sessions.filter(s => s.status === "completed");
    const dailyMap: Record<string, number> = {};
    completed.forEach(s => {
      const day = s.startedAt.toISOString().split("T")[0]!;
      dailyMap[day] = (dailyMap[day] ?? 0) + s.durationMin;
    });
    return dailyMap;
  }),

  getLeaderboard: publicProcedure.query(async () => {
    return getLeaderboard(10);
  }),

  getWeeklyInsight: protectedProcedure
    .input(z.object({ weekStart: z.date() }))
    .query(async ({ ctx, input }) => {
      return getWeeklyInsight(ctx.user.id, input.weekStart);
    }),

  generateInsight: protectedProcedure
    .input(z.object({
      weekStart: z.date(),
      statsSnapshot: z.object({
        focusMinutes: z.number(),
        sessionsDone: z.number(),
        sessionsAbandoned: z.number(),
        xpEarned: z.number(),
        bestDay: z.string().nullable(),
        dailyBreakdown: z.array(z.object({ date: z.string(), minutes: z.number() })),
      }),
      claudeKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { statsSnapshot, weekStart } = input;
      const weekStr = weekStart.toISOString().split("T")[0];

      const prompt = `Analise estes dados de foco e produção criativa de um designer para a semana de ${weekStr}:

- Total de foco: ${Math.floor((statsSnapshot.focusMinutes) / 60)}h${(statsSnapshot.focusMinutes) % 60}m
- Sessões concluídas: ${statsSnapshot.sessionsDone}
- Sessões abandonadas: ${statsSnapshot.sessionsAbandoned}
- XP ganho: ${statsSnapshot.xpEarned}
- Dia mais produtivo: ${statsSnapshot.bestDay ?? "não identificado"}
- Distribuição diária: ${JSON.stringify(statsSnapshot.dailyBreakdown)}

Gere um insight discreto e útil (máximo 2 frases) sobre os padrões de foco desta semana e uma sugestão prática para a próxima. Responda em português. Seja direto e específico. Não use emojis.`;

      const response = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
      });

      const insightText = (response as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content?.trim() ?? "";

      if (insightText) {
        await saveWeeklyInsight({
          userId: ctx.user.id,
          weekStart,
          insightText,
          statsSnapshot,
        });
      }

      return { insightText };
    }),
});

// ─── Admin ────────────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores" });
  }
  return next({ ctx });
});

const adminRouter = router({
  getStats: adminProcedure.query(async () => {
    return getSystemStats();
  }),

  getAllUsers: adminProcedure.query(async () => {
    return getAllUsers();
  }),

  setUserXP: adminProcedure
    .input(z.object({
      targetUserId: z.number().int(),
      xp: z.number().int().min(0),
      glifos: z.number().int().min(0),
      rankId: z.number().int().min(1).max(7),
    }))
    .mutation(async ({ input }) => {
      await updateUserNexus(input.targetUserId, {
        xp: input.xp,
        glifos: input.glifos,
        rankId: input.rankId,
      });
      return { success: true };
    }),

  resetUser: adminProcedure
    .input(z.object({ targetUserId: z.number().int() }))
    .mutation(async ({ input }) => {
      await adminResetUser(input.targetUserId);
      return { success: true };
    }),

  simulateSessions: adminProcedure
    .input(z.object({
      count: z.number().int().min(1).max(50),
      durationMin: z.number().int().refine(v => v === 25 || v === 50),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      for (let i = 0; i < input.count; i++) {
        const start = new Date(now.getTime() - i * 30 * 60 * 1000);
        const xp = input.durationMin === 25 ? 15 : 35;
        const glifos = input.durationMin === 25 ? 10 : 25;
        await saveSession({
          userId: ctx.user.id,
          startedAt: start,
          completedAt: new Date(start.getTime() + input.durationMin * 60000),
          durationMin: input.durationMin,
          status: "completed",
          taskName: `Sessão de teste ${i + 1}`,
          toolActive: "arquivo",
          xpEarned: xp,
          glifosEarned: glifos,
          wasFocused: true,
        });
      }
      const totalXp = input.count * (input.durationMin === 25 ? 15 : 35);
      const totalGlifos = input.count * (input.durationMin === 25 ? 10 : 25);
      const profile = await getUserProfile(ctx.user.id);
      await updateUserNexus(ctx.user.id, {
        xp: (profile?.xp ?? 0) + totalXp,
        glifos: (profile?.glifos ?? 0) + totalGlifos,
      });
      return { success: true, xpGained: totalXp, glifosGained: totalGlifos };
    }),
});

// ─── Export ───────────────────────────────────────────────────────────────────
export const cortexRouter = router({
  nexus: nexusRouter,
  dashboard: dashboardRouter,
  admin: adminRouter,
});
