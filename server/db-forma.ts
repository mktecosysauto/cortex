import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { formaBriefings, formaResponses, formaFollowups } from "../drizzle/schema";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(20).toString("hex");
}

// ─── Briefings ────────────────────────────────────────────────────────────────

export async function listBriefings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(formaBriefings)
    .where(eq(formaBriefings.userId, userId))
    .orderBy(desc(formaBriefings.createdAt));
}

export async function getBriefing(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(formaBriefings)
    .where(and(eq(formaBriefings.id, id), eq(formaBriefings.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getBriefingByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(formaBriefings)
    .where(eq(formaBriefings.publicToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function createBriefing(data: {
  userId: number;
  title: string;
  projectType: string;
  clientName: string;
  clientEmail: string;
  brandColorPrimary?: string;
  brandColorSecondary?: string;
  brandNameDisplay?: string;
  brandLogoUrl?: string;
  openingMessage?: string;
  closingMessage?: string;
  questionIds: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const token = generateToken();
  const result = await db.insert(formaBriefings).values({
    userId: data.userId,
    title: data.title,
    projectType: data.projectType,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    publicToken: token,
    brandColorPrimary: data.brandColorPrimary ?? "#000000",
    brandColorSecondary: data.brandColorSecondary ?? "#ffffff",
    brandNameDisplay: data.brandNameDisplay ?? null,
    brandLogoUrl: data.brandLogoUrl ?? null,
    openingMessage: data.openingMessage ?? null,
    closingMessage: data.closingMessage ?? null,
    questionIds: data.questionIds,
    status: "draft",
  });
  const id = (result as unknown as [{ insertId: number }])[0].insertId;
  return { id, token };
}

export async function updateBriefing(
  id: number,
  userId: number,
  data: Partial<{
    title: string;
    projectType: string;
    clientName: string;
    clientEmail: string;
    brandColorPrimary: string;
    brandColorSecondary: string;
    brandNameDisplay: string | null;
    brandLogoUrl: string | null;
    openingMessage: string | null;
    closingMessage: string | null;
    questionIds: string[];
    status: string;
    aiSummary: string | null;
    aiConcept: string | null;
    aiNextSteps: string | null;
    aiGeneratedAt: Date | null;
    sentAt: Date | null;
    answeredAt: Date | null;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(formaBriefings)
    .set(data as Record<string, unknown>)
    .where(and(eq(formaBriefings.id, id), eq(formaBriefings.userId, userId)));
}

export async function updateBriefingByToken(
  token: string,
  data: Partial<{
    status: string;
    answeredAt: Date | null;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(formaBriefings)
    .set(data as Record<string, unknown>)
    .where(eq(formaBriefings.publicToken, token));
}

export async function deleteBriefing(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Verify ownership before deleting
  const rows = await db.select({ id: formaBriefings.id }).from(formaBriefings)
    .where(and(eq(formaBriefings.id, id), eq(formaBriefings.userId, userId))).limit(1);
  if (!rows[0]) return;
  // Cascade delete child rows first
  await db.delete(formaResponses).where(eq(formaResponses.briefingId, id));
  await db.delete(formaFollowups).where(eq(formaFollowups.briefingId, id));
  await db.delete(formaBriefings).where(eq(formaBriefings.id, id));
}

// ─── Responses ────────────────────────────────────────────────────────────────

export async function getResponses(briefingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(formaResponses)
    .where(eq(formaResponses.briefingId, briefingId))
    .orderBy(formaResponses.createdAt);
}

export async function saveResponses(
  briefingId: number,
  responses: { questionId: string; questionText: string; answer: string; isFollowup?: boolean }[]
) {
  const db = await getDb();
  if (!db || responses.length === 0) return;
  await db.insert(formaResponses).values(
    responses.map((r) => ({
      briefingId,
      questionId: r.questionId,
      questionText: r.questionText,
      answer: r.answer,
      isFollowup: r.isFollowup ?? false,
    }))
  );
}

// ─── Followups ────────────────────────────────────────────────────────────────

export async function getFollowups(briefingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(formaFollowups)
    .where(eq(formaFollowups.briefingId, briefingId))
    .orderBy(formaFollowups.sentAt);
}

export async function createFollowup(briefingId: number, question: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(formaFollowups).values({
    briefingId,
    question,
    status: "pending",
  });
  return (result as unknown as [{ insertId: number }])[0].insertId;
}

export async function answerFollowup(id: number, briefingId: number, answer: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(formaFollowups)
    .set({ answer, status: "answered", answeredAt: new Date() })
    .where(and(eq(formaFollowups.id, id), eq(formaFollowups.briefingId, briefingId)));
}
