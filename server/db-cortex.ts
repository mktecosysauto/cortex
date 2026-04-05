import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { cortexSessions, cortexTasks, cortexToolEvents, cortexWeeklyInsights, users } from "../drizzle/schema";
import { getDb } from "./db";

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}

export async function updateUserNexus(userId: number, data: {
  agentName?: string;
  agentAppearance?: { paletteId: string | null; silhouetteId: string | null; effectId: string | null; titleId: string | null };
  xp?: number;
  glifos?: number;
  rankId?: number;
  purchases?: string[];
  showInRanking?: boolean;
  sprintGoalHours?: number | null;
  sprintStartDate?: Date | null;
  goalDailyMin?: number;
  goalWeeklyMin?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data as Record<string, unknown>).where(eq(users.id, userId));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function saveSession(data: {
  userId: number;
  startedAt: Date;
  completedAt?: Date;
  durationMin: number;
  status: "completed" | "abandoned" | "paused";
  taskName?: string;
  toolActive?: string;
  xpEarned: number;
  glifosEarned: number;
  wasFocused: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(cortexSessions).values(data);
  return result;
}

export async function getSessionsInRange(userId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cortexSessions)
    .where(and(
      eq(cortexSessions.userId, userId),
      gte(cortexSessions.startedAt, from),
      lte(cortexSessions.startedAt, to)
    ))
    .orderBy(desc(cortexSessions.startedAt));
}

export async function getSessionsLast30Days(userId: number) {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return getSessionsInRange(userId, from, new Date());
}

// ─── Tool Events ──────────────────────────────────────────────────────────────
export async function saveToolEvent(data: {
  userId: number;
  tool: string;
  eventType: string;
  xpEarned: number;
  glifosEarned: number;
  wasFocused: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(cortexToolEvents).values(data);
}

export async function getToolEventsInRange(userId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cortexToolEvents)
    .where(and(
      eq(cortexToolEvents.userId, userId),
      gte(cortexToolEvents.createdAt, from),
      lte(cortexToolEvents.createdAt, to)
    ));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function saveTask(data: {
  userId: number;
  title: string;
  difficulty: "facil" | "media" | "dificil" | "lendaria";
  toolContext?: string;
  xpEarned: number;
  glifosEarned: number;
}) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(cortexTasks).values({ ...data, status: "done", completedAt: new Date() });
}

// ─── Weekly Insights ──────────────────────────────────────────────────────────
export async function getWeeklyInsight(userId: number, weekStart: Date) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cortexWeeklyInsights)
    .where(and(
      eq(cortexWeeklyInsights.userId, userId),
      eq(cortexWeeklyInsights.weekStart, weekStart)
    ))
    .limit(1);
  return result[0] ?? null;
}

export async function saveWeeklyInsight(data: {
  userId: number;
  weekStart: Date;
  insightText: string;
  statsSnapshot: unknown;
}) {
  const db = await getDb();
  if (!db) return null;
  // Upsert: delete existing then insert
  await db.delete(cortexWeeklyInsights)
    .where(and(
      eq(cortexWeeklyInsights.userId, data.userId),
      eq(cortexWeeklyInsights.weekStart, data.weekStart)
    ));
  return db.insert(cortexWeeklyInsights).values(data);
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export async function getLeaderboard(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    agentName: users.agentName,
    name: users.name,
    xp: users.xp,
    rankId: users.rankId,
    agentAppearance: users.agentAppearance,
  })
    .from(users)
    .where(eq(users.showInRanking, true))
    .orderBy(desc(users.xp))
    .limit(limit);
}

// ─── Admin Queries ────────────────────────────────────────────────────────────
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    xp: users.xp,
    glifos: users.glifos,
    rankId: users.rankId,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.xp));
}

export async function adminResetUser(targetUserId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ xp: 0, glifos: 0, rankId: 1, purchases: null }).where(eq(users.id, targetUserId));
  await db.delete(cortexSessions).where(eq(cortexSessions.userId, targetUserId));
  await db.delete(cortexToolEvents).where(eq(cortexToolEvents.userId, targetUserId));
}

export async function getSystemStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, sessionsToday: 0, sessionsWeek: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));

  const [totalUsersRes, sessionsTodayRes, sessionsWeekRes] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(cortexSessions)
      .where(gte(cortexSessions.startedAt, today)),
    db.select({ count: sql<number>`count(*)` }).from(cortexSessions)
      .where(and(
        gte(cortexSessions.startedAt, weekStart),
        eq(cortexSessions.status, "completed")
      )),
  ]);

  return {
    totalUsers: Number(totalUsersRes[0]?.count ?? 0),
    sessionsToday: Number(sessionsTodayRes[0]?.count ?? 0),
    sessionsWeek: Number(sessionsWeekRes[0]?.count ?? 0),
  };
}
