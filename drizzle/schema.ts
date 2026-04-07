import {
  boolean,
  date,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // NEXUS fields
  agentName: varchar("agentName", { length: 64 }).default("AGENTE"),
  agentAppearance: json("agentAppearance").$type<{
    paletteId: string | null;
    silhouetteId: string | null;
    effectId: string | null;
    titleId: string | null;
  }>(),
  xp: int("xp").default(0).notNull(),
  glifos: int("glifos").default(0).notNull(),
  rankId: int("rankId").default(1).notNull(),
  purchases: json("purchases").$type<string[]>(),
  showInRanking: boolean("showInRanking").default(true).notNull(),
  sprintGoalHours: int("sprintGoalHours"),
  sprintStartDate: timestamp("sprintStartDate"),
  goalDailyMin: int("goalDailyMin").default(0).notNull(),
  goalWeeklyMin: int("goalWeeklyMin").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Cortex Sessions (Pomodoro) ───────────────────────────────────────────────
export const cortexSessions = mysqlTable("cortex_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  durationMin: int("durationMin").notNull(),
  status: mysqlEnum("status", ["completed", "abandoned", "paused"]).notNull(),
  taskName: varchar("taskName", { length: 256 }),
  toolActive: varchar("toolActive", { length: 64 }),
  xpEarned: int("xpEarned").default(0).notNull(),
  glifosEarned: int("glifosEarned").default(0).notNull(),
  wasFocused: boolean("wasFocused").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CortexSession = typeof cortexSessions.$inferSelect;
export type InsertCortexSession = typeof cortexSessions.$inferInsert;

// ─── Cortex Tasks ─────────────────────────────────────────────────────────────
export const cortexTasks = mysqlTable("cortex_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: text("title").notNull(),
  difficulty: mysqlEnum("difficulty", ["facil", "media", "dificil", "lendaria"]).default("facil").notNull(),
  status: mysqlEnum("status", ["pending", "done", "archived"]).default("pending").notNull(),
  toolContext: varchar("toolContext", { length: 64 }),
  xpEarned: int("xpEarned").default(0).notNull(),
  glifosEarned: int("glifosEarned").default(0).notNull(),
  originalDeadline: date("originalDeadline"),
  currentDeadline: date("currentDeadline"),
  deadlineChanged: boolean("deadlineChanged").default(false).notNull(),
  bonusEligible: boolean("bonusEligible").default(true).notNull(),
  archivedAt: timestamp("archivedAt"),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CortexTask = typeof cortexTasks.$inferSelect;
export type InsertCortexTask = typeof cortexTasks.$inferInsert;

// ─── Cortex Tool Events ───────────────────────────────────────────────────────
export const cortexToolEvents = mysqlTable("cortex_tool_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  tool: varchar("tool", { length: 64 }).notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  xpEarned: int("xpEarned").default(0).notNull(),
  glifosEarned: int("glifosEarned").default(0).notNull(),
  wasFocused: boolean("wasFocused").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CortexToolEvent = typeof cortexToolEvents.$inferSelect;
export type InsertCortexToolEvent = typeof cortexToolEvents.$inferInsert;

// ─── Cortex Weekly Insights ───────────────────────────────────────────────────
export const cortexWeeklyInsights = mysqlTable("cortex_weekly_insights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  weekStart: timestamp("weekStart").notNull(),
  insightText: text("insightText"),
  statsSnapshot: json("statsSnapshot"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type CortexWeeklyInsight = typeof cortexWeeklyInsights.$inferSelect;
export type InsertCortexWeeklyInsight = typeof cortexWeeklyInsights.$inferInsert;

// ─── Verso Brand Voice ─────────────────────────────────────────────────────
export const versoBrandVoice = mysqlTable("verso_brand_voice", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  brandName: varchar("brandName", { length: 100 }).default("").notNull(),
  brandDesc: text("brandDesc"),
  toneKeywords: json("toneKeywords").$type<string[]>(),
  toneAvoid: json("toneAvoid").$type<string[]>(),
  exampleText: text("exampleText"),
  persona: text("persona"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VersoBrandVoice = typeof versoBrandVoice.$inferSelect;
export type InsertVersoBrandVoice = typeof versoBrandVoice.$inferInsert;

// ─── Verso Texts ───────────────────────────────────────────────────────────────
export const versoTexts = mysqlTable("verso_texts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).default("Sem título").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  templateId: varchar("templateId", { length: 64 }).notNull(),
  content: text("content").notNull(),
  toneSnapshot: json("toneSnapshot"),
  inputFields: json("inputFields"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VersoText = typeof versoTexts.$inferSelect;
export type InsertVersoText = typeof versoTexts.$inferInsert;

// ─── FORMA — Briefings ─────────────────────────────────────────────────────
export const formaBriefings = mysqlTable("forma_briefings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  projectType: varchar("projectType", { length: 64 }).notNull(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 200 }).notNull(),
  publicToken: varchar("publicToken", { length: 64 }).notNull(),
  brandLogoUrl: text("brandLogoUrl"),
  brandColorPrimary: varchar("brandColorPrimary", { length: 16 }).default("#000000").notNull(),
  brandColorSecondary: varchar("brandColorSecondary", { length: 16 }).default("#ffffff").notNull(),
  brandNameDisplay: varchar("brandNameDisplay", { length: 200 }),
  openingMessage: text("openingMessage"),
  closingMessage: text("closingMessage"),
  questionIds: json("questionIds").$type<string[]>().notNull(),
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  aiSummary: text("aiSummary"),
  aiConcept: text("aiConcept"),
  aiNextSteps: text("aiNextSteps"),
  aiGeneratedAt: timestamp("aiGeneratedAt"),
  sentAt: timestamp("sentAt"),
  answeredAt: timestamp("answeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FormaBriefing = typeof formaBriefings.$inferSelect;
export type InsertFormaBriefing = typeof formaBriefings.$inferInsert;

// ─── FORMA — Responses ─────────────────────────────────────────────────────
export const formaResponses = mysqlTable("forma_responses", {
  id: int("id").autoincrement().primaryKey(),
  briefingId: int("briefingId").notNull().references(() => formaBriefings.id),
  questionId: varchar("questionId", { length: 64 }).notNull(),
  questionText: text("questionText").notNull(),
  answer: text("answer").notNull(),
  isFollowup: boolean("isFollowup").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FormaResponse = typeof formaResponses.$inferSelect;
export type InsertFormaResponse = typeof formaResponses.$inferInsert;

// ─── FORMA — Followups ─────────────────────────────────────────────────────
export const formaFollowups = mysqlTable("forma_followups", {
  id: int("id").autoincrement().primaryKey(),
  briefingId: int("briefingId").notNull().references(() => formaBriefings.id),
  question: text("question").notNull(),
  answer: text("answer"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  answeredAt: timestamp("answeredAt"),
});
export type FormaFollowup = typeof formaFollowups.$inferSelect;
export type InsertFormaFollowup = typeof formaFollowups.$inferInsert;

// ─── ARQUIVO — Collections ─────────────────────────────────────────────────
export const arquivoCollections = mysqlTable("arquivo_collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  coverUrl: text("coverUrl"),
  isSystem: boolean("isSystem").default(false).notNull(),
  promptCount: int("promptCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArquivoCollection = typeof arquivoCollections.$inferSelect;
export type InsertArquivoCollection = typeof arquivoCollections.$inferInsert;

// ─── ARQUIVO — Prompts ─────────────────────────────────────────────────────
export const arquivoPrompts = mysqlTable("arquivo_prompts", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull().references(() => arquivoCollections.id),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  tags: json("tags").$type<string[]>().default([]).notNull(),
  prompt: text("prompt").notNull(),
  imgUrl: text("imgUrl"),
  isSystem: boolean("isSystem").default(false).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArquivoPrompt = typeof arquivoPrompts.$inferSelect;
export type InsertArquivoPrompt = typeof arquivoPrompts.$inferInsert;
