import { eq, desc, and, asc } from "drizzle-orm";
import { getDb } from "./db";
import {
  arquivoCollections,
  arquivoPrompts,
  ArquivoCollection,
  ArquivoPrompt,
} from "../drizzle/schema";

// ─── Base prompts seed data ───────────────────────────────────────────────────
const AUTOMOTIVOS_SEED = [
  { title: "PORSCHE 911 — BLACK", tags: ["Side Profile", "Misty Field", "Moody"], prompt: "A cinematic landscape image featuring a vintage black Porsche 911 parked on a straight road cutting through lush green field. Side view, crisp detailing. Moody atmosphere, vibrant foreground fading into soft mist. Mist blurs horizon. Atmospheric and dramatic, balance of realism and artistic mood.", order: 1 },
  { title: "PORSCHE 911 — SILVER", tags: ["Front 3/4", "Golden Hour", "Country Road"], prompt: "Photorealistic. Classic Porsche 911 driving towards viewer on winding country road, golden hour. Road curves right, lush green banks, fallen leaves. Stone bridge, rolling sunlit hills, autumn foliage. Warm sunlight through branches, long soft shadows. Golden glow, pastel sky, wispy clouds. Ultra-sharp, cinematic lighting, HDR, realistic reflections.", order: 2 },
  { title: "BMW F30 — BLACK", tags: ["Motion Shot", "Dirt Track", "8K"], prompt: "Photo of a black BMW F30 participating in a race on a track with flying 3D dirt and dust particles, motion shot, ultra-detailed photo, 8K quality.", order: 3 },
  { title: "PORSCHE 911 DAKAR 930", tags: ["Ultra-Low Angle", "Forest Rally", "Mud Splatter"], prompt: "Rugged off-road rally scene, dense sunlit forest. Classic 911 Dakar (930) speeds on dirt trail. Ultra-low close-up, front right side, slight upward tilt, 20mm wide-angle near front left wheel. Headlight on, glowing warmly. Body splattered with mud. Rally tires kick up soil and dirt particles frozen mid-air. Sharp foreground dirt, slightly blurred background. Natural colors, cinematic lighting, photorealistic, high resolution.", order: 4 },
  { title: "MERCEDES G-CLASS — MATURE", tags: ["Human Model", "Mountain Lake", "Mature Male"], prompt: "Casual spontaneous candid. Mature European man leaning against matte black Mercedes-Benz G-Class SUV beside tranquil mountain lake. Lived-in dark-gray wool jacket, black t-shirt, loose gray pants, crisp white sneakers. Lake reflects pine-covered peaks. Natural ambient light on jacket wool texture and worn SUV surface. Eye level, relaxed off-center composition. Authentic skin texture, fabric grain, environmental shadows. iPhone snapshot feel. Quietly contemplative. Urban style meets natural stillness.", order: 5 },
  { title: "MERCEDES G-CLASS — YOUNG", tags: ["Human Model", "Mountain Lake", "Young Male"], prompt: "Casual spontaneous candid. Young European man leaning against matte black Mercedes-Benz G-Class SUV beside tranquil mountain lake. Dark-gray wool jacket, black t-shirt, loose gray pants, crisp white sneakers. Lake reflects pine-covered peaks. Natural ambient light. Eye level, relaxed off-center composition. Authentic skin texture, fabric grain. iPhone snapshot feel.", order: 6 },
  { title: "RED SPORT COUPE", tags: ["Overhead Top-Down", "Male Model", "Editorial"], prompt: "High-end automotive campaign shot, overhead top-down composition, full red sport coupe fully visible, door open, male model as luxury streetwear, clean minimalist asphalt, softbox-like daylight, controlled shadows, immaculate reflections, premium editorial retouching, photoreal, no text, no watermark, no busy background.", order: 7 },
  { title: "VINTAGE GREEN SEDAN", tags: ["Fashion Portrait", "Colonnade", "Retro Luxury"], prompt: "Cinematic fashion portrait. Asian man early 30s, vintage green classic sedan. Dark green fur coat, mustard-brown cardigan, patterned yellow shirt, olive tailored trousers, brown leather loafers, mustard socks, dark green fedora. Brown-tinted aviators, cigarette. Grand neoclassical colonnade, tall stone pillars, symmetrical corridor, black-and-white checkered marble floor. Soft morning fog, pink flowers. Soft cinematic daylight. Muted greens, warm mustard tones, teal shadows. Retro luxury. 50mm, shallow DOF.", order: 8 },
  { title: "AUDI R8 — RED", tags: ["Overhead Top-Down", "Dark Garage", "Editorial"], prompt: "High-end automotive campaign shot, overhead top-down composition, full red Audi R8 fully visible, door open, male model in luxury streetwear, dark dramatic garage setting, controlled spotlights, immaculate reflections on polished floor, premium editorial retouching, photoreal, no text, no watermark.", order: 9 },
  { title: "LAMBORGHINI URUS", tags: ["Low Angle Rear", "Off-Road Mud", "Action"], prompt: "Ultra-realistic action shot. Lamborghini Urus tearing through muddy off-road trail at high speed, low dynamic frontal angle. Mud splashes violently, flying debris and water droplets frozen mid-air. Massive wheels in motion, coated in thick mud, power and aggression. Dirt textures, reflections, realistic lighting on body contours. Cloudy sky, dramatic light breaking through. Intense motion blur, bokeh from mud and water splatter. Raw movement, energy, off-road domination, cinematic style.", order: 10 },
  { title: "TOYOTA CARINA — WHITE", tags: ["Side 3/4", "Daisy Field", "Japanese"], prompt: "Photorealistic 1993 Toyota Carina, white. Parked in field among white daisies and green grass. Daisies in style of Japanese drawing. Japanese mountains background. Slightly sideways, hood facing viewer, right side forward. Cool wheels. Professional photography, natural lighting. --ar 3:4, --v7", order: 11 },
  { title: "PORSCHE 911 — NIGHT CITY", tags: ["Front 3/4", "Night", "Urban Neon"], prompt: "Photorealistic Porsche 911 parked on wet urban street at night. Front 3/4 view. Neon reflections on wet asphalt, city lights bokeh background. Low ambient light, dramatic highlights on bodywork. Cinematic night photography, shallow depth of field, 35mm lens.", order: 12 },
  { title: "FERRARI — EDITORIAL", tags: ["Studio", "White Background", "Luxury"], prompt: "Studio automotive photography. Ferrari on pure white seamless background. Three-quarter front view. Professional automotive lighting setup, perfectly even illumination, subtle shadow under car. Ultra-sharp details, paint reflections, chrome details. Luxury car catalog style, photoreal, no text.", order: 13 },
];

// ─── Collections ──────────────────────────────────────────────────────────────

export async function getCollections(userId: number): Promise<ArquivoCollection[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(arquivoCollections)
    .where(eq(arquivoCollections.userId, userId))
    .orderBy(asc(arquivoCollections.createdAt));
}

export async function getCollection(
  userId: number,
  collectionId: number
): Promise<ArquivoCollection | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(arquivoCollections)
    .where(and(eq(arquivoCollections.id, collectionId), eq(arquivoCollections.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCollection(
  userId: number,
  data: { name: string; description?: string; isSystem?: boolean }
): Promise<ArquivoCollection | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(arquivoCollections).values({
    userId,
    name: data.name,
    description: data.description ?? null,
    isSystem: data.isSystem ?? false,
    promptCount: 0,
  });
  const id = (result as unknown as [{ insertId: number }])[0].insertId;
  const rows = await db
    .select()
    .from(arquivoCollections)
    .where(eq(arquivoCollections.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateCollection(
  userId: number,
  collectionId: number,
  data: { name?: string; description?: string; coverUrl?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(arquivoCollections)
    .set(data)
    .where(and(eq(arquivoCollections.id, collectionId), eq(arquivoCollections.userId, userId)));
}

export async function deleteCollection(userId: number, collectionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete all prompts first
  await db
    .delete(arquivoPrompts)
    .where(and(eq(arquivoPrompts.collectionId, collectionId), eq(arquivoPrompts.userId, userId)));
  // Then delete collection
  await db
    .delete(arquivoCollections)
    .where(and(eq(arquivoCollections.id, collectionId), eq(arquivoCollections.userId, userId)));
}

async function syncPromptCount(db: Awaited<ReturnType<typeof getDb>>, collectionId: number) {
  if (!db) return;
  const prompts = await db
    .select()
    .from(arquivoPrompts)
    .where(eq(arquivoPrompts.collectionId, collectionId));
  await db
    .update(arquivoCollections)
    .set({ promptCount: prompts.length })
    .where(eq(arquivoCollections.id, collectionId));
}

// ─── Seed automotivos collection for new user ─────────────────────────────────

export async function seedAutomotivosCollection(userId: number): Promise<ArquivoCollection | null> {
  const db = await getDb();
  if (!db) return null;

  // Check if already seeded
  const existing = await db
    .select()
    .from(arquivoCollections)
    .where(and(eq(arquivoCollections.userId, userId), eq(arquivoCollections.isSystem, true)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  // Create the automotivos collection
  const collection = await createCollection(userId, {
    name: "AUTOMOTIVOS",
    description: "Referências de fotografia automotiva — prompts para Midjourney, Freepik e outros geradores de imagem.",
    isSystem: true,
  });

  if (!collection) return null;

  // Seed all prompts
  for (const seed of AUTOMOTIVOS_SEED) {
    await db.insert(arquivoPrompts).values({
      collectionId: collection.id,
      userId,
      title: seed.title,
      tags: seed.tags,
      prompt: seed.prompt,
      isSystem: true,
      displayOrder: seed.order,
    });
  }

  // Update prompt count
  await syncPromptCount(db, collection.id);

  // Re-fetch with updated count
  const updated = await getCollection(userId, collection.id);
  return updated;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

export async function getPrompts(
  userId: number,
  collectionId: number
): Promise<ArquivoPrompt[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(arquivoPrompts)
    .where(and(eq(arquivoPrompts.collectionId, collectionId), eq(arquivoPrompts.userId, userId)))
    .orderBy(asc(arquivoPrompts.displayOrder), asc(arquivoPrompts.createdAt));
}

export async function createPrompt(
  userId: number,
  collectionId: number,
  data: { title: string; tags?: string[]; prompt: string; imgUrl?: string }
): Promise<ArquivoPrompt | null> {
  const db = await getDb();
  if (!db) return null;

  // Get current max order
  const existing = await getPrompts(userId, collectionId);
  const maxOrder = existing.reduce((m, p) => Math.max(m, p.displayOrder), 0);

  const result = await db.insert(arquivoPrompts).values({
    collectionId,
    userId,
    title: data.title,
    tags: data.tags ?? [],
    prompt: data.prompt,
    imgUrl: data.imgUrl ?? null,
    isSystem: false,
    displayOrder: maxOrder + 1,
  });
  const id = (result as unknown as [{ insertId: number }])[0].insertId;
  const rows = await db
    .select()
    .from(arquivoPrompts)
    .where(eq(arquivoPrompts.id, id))
    .limit(1);

  await syncPromptCount(db, collectionId);
  return rows[0] ?? null;
}

export async function updatePrompt(
  userId: number,
  promptId: number,
  data: { title?: string; tags?: string[]; prompt?: string; imgUrl?: string | null }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(arquivoPrompts)
    .set(data)
    .where(and(eq(arquivoPrompts.id, promptId), eq(arquivoPrompts.userId, userId)));
}

export async function deletePrompt(userId: number, promptId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Get collectionId before deleting
  const rows = await db
    .select()
    .from(arquivoPrompts)
    .where(and(eq(arquivoPrompts.id, promptId), eq(arquivoPrompts.userId, userId)))
    .limit(1);
  const collectionId = rows[0]?.collectionId;

  await db
    .delete(arquivoPrompts)
    .where(and(eq(arquivoPrompts.id, promptId), eq(arquivoPrompts.userId, userId)));

  if (collectionId) await syncPromptCount(db, collectionId);
}
