import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Cube Types Enum
export const cubeTypes = {
  SKEWB: "Skewb",
  THREE_BLD: "3x3 BLD",
  TWO: "2x2",
  THREE: "3x3",
  PYRAMINX: "Pyraminx",
  THREE_OH: "3x3 OH",
  CLOCK: "Clock"
} as const;

export type CubeType = typeof cubeTypes[keyof typeof cubeTypes];

// Bot Configuration Table
export const botConfig = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  guildId: text("guild_id").notNull(),
  timeToPost: text("time_to_post").notNull().default("16:00"), // 4 PM in 24h format
  timezone: text("timezone").notNull().default("Asia/Kolkata"), // IST
  enabled: boolean("enabled").notNull().default(true),
  deleteAfterHours: integer("delete_after_hours").notNull().default(24),
});

// Challenge Threads Table
export const challengeThreads = pgTable("challenge_threads", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  channelId: text("channel_id").notNull(),
  guildId: text("guild_id").notNull(),
  cubeType: text("cube_type").notNull(),
  scramble: text("scramble").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Schemas for inserting data
export const insertBotConfigSchema = createInsertSchema(botConfig).pick({
  channelId: true,
  guildId: true,
  timeToPost: true,
  timezone: true,
  enabled: true,
  deleteAfterHours: true,
});

export const insertChallengeThreadSchema = createInsertSchema(challengeThreads).pick({
  threadId: true,
  channelId: true,
  guildId: true,
  cubeType: true,
  scramble: true,
  expiresAt: true,
});

// Types for application use
export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;

export type ChallengeThread = typeof challengeThreads.$inferSelect;
export type InsertChallengeThread = z.infer<typeof insertChallengeThreadSchema>;

// Weekly schedule type
export const daySchedule = {
  MONDAY: cubeTypes.SKEWB,
  TUESDAY: cubeTypes.THREE_BLD,
  WEDNESDAY: cubeTypes.TWO,
  THURSDAY: cubeTypes.THREE,
  FRIDAY: cubeTypes.PYRAMINX,
  SATURDAY: cubeTypes.THREE_OH,
  SUNDAY: cubeTypes.CLOCK
} as const;

export type DayOfWeek = keyof typeof daySchedule;
