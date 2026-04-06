import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  versoBrandVoice,
  versoTexts,
  VersoBrandVoice,
  VersoText,
} from "../drizzle/schema";

// ─── Brand Voice ──────────────────────────────────────────────────────────────

export async function getBrandVoice(userId: number): Promise<VersoBrandVoice | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(versoBrandVoice)
    .where(eq(versoBrandVoice.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertBrandVoice(
  userId: number,
  data: {
    brandName: string;
    brandDesc?: string;
    persona?: string;
    toneKeywords?: string[];
    toneAvoid?: string[];
    exampleText?: string;
  }
): Promise<VersoBrandVoice | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await getBrandVoice(userId);

  if (existing) {
    await db
      .update(versoBrandVoice)
      .set({
        brandName: data.brandName,
        brandDesc: data.brandDesc ?? null,
        persona: data.persona ?? null,
        toneKeywords: data.toneKeywords ?? [],
        toneAvoid: data.toneAvoid ?? [],
        exampleText: data.exampleText ?? null,
      })
      .where(eq(versoBrandVoice.id, existing.id));
    return (await getBrandVoice(userId))!;
  } else {
    await db.insert(versoBrandVoice).values({
      userId,
      brandName: data.brandName,
      brandDesc: data.brandDesc ?? null,
      persona: data.persona ?? null,
      toneKeywords: data.toneKeywords ?? [],
      toneAvoid: data.toneAvoid ?? [],
      exampleText: data.exampleText ?? null,
    });
    return (await getBrandVoice(userId))!;
  }
}

// ─── Texts Library ────────────────────────────────────────────────────────────

export async function getVersoLibrary(userId: number): Promise<VersoText[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(versoTexts)
    .where(eq(versoTexts.userId, userId))
    .orderBy(desc(versoTexts.createdAt));
}

export async function saveVersoText(
  userId: number,
  data: {
    title: string;
    category: string;
    templateId: string;
    content: string;
    toneSnapshot?: Record<string, unknown>;
    inputFields?: Record<string, unknown>;
  }
): Promise<VersoText | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(versoTexts).values({
    userId,
    title: data.title,
    category: data.category,
    templateId: data.templateId,
    content: data.content,
    toneSnapshot: data.toneSnapshot ?? null,
    inputFields: data.inputFields ?? null,
  });
  const id = (result as unknown as [{ insertId: number }])[0].insertId;
  const rows = await db
    .select()
    .from(versoTexts)
    .where(eq(versoTexts.id, id))
    .limit(1);
  return rows[0];
}

export async function updateVersoText(
  userId: number,
  textId: number,
  data: { title?: string; content?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(versoTexts)
    .set({ ...data })
    .where(and(eq(versoTexts.id, textId), eq(versoTexts.userId, userId)));
}

export async function deleteVersoText(
  userId: number,
  textId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(versoTexts)
    .where(and(eq(versoTexts.id, textId), eq(versoTexts.userId, userId)));
}
