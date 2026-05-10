import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  json,
  int,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const resumes = mysqlTable("resumes", {
  id: serial("id").primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  parsedSkills: json("parsedSkills").$type<string[]>(),
  targetRole: varchar("targetRole", { length: 100 }),
  experienceLevel: varchar("experienceLevel", { length: 50 }),
  status: mysqlEnum("status", ["analyzing", "ready", "error"]).default("analyzing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Resume = typeof resumes.$inferSelect;
export type InsertResume = typeof resumes.$inferInsert;

export const trendResults = mysqlTable("trendResults", {
  id: serial("id").primaryKey(),
  resumeId: int("resumeId").notNull(),
  domain: varchar("domain", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  relevanceScore: int("relevanceScore").notNull(),
  keyPoints: json("keyPoints").$type<string[]>(),
  learningAdvice: text("learningAdvice"),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  sourceTitle: varchar("sourceTitle", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrendResult = typeof trendResults.$inferSelect;
export type InsertTrendResult = typeof trendResults.$inferInsert;

export const projectResults = mysqlTable("projectResults", {
  id: serial("id").primaryKey(),
  resumeId: int("resumeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  projectType: mysqlEnum("projectType", ["quick_win", "weekend_build", "deep_dive"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).notNull(),
  timeEstimate: varchar("timeEstimate", { length: 100 }).notNull(),
  techStack: json("techStack").$type<string[]>(),
  gapAddressed: varchar("gapAddressed", { length: 255 }).notNull(),
  description: text("description").notNull(),
  coreFeatures: json("coreFeatures").$type<string[]>(),
  techHighlights: json("techHighlights").$type<string[]>(),
  implementationSteps: json("implementationSteps").$type<string[]>(),
  resumeTemplate: text("resumeTemplate"),
  impactScore: int("impactScore").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectResult = typeof projectResults.$inferSelect;
export type InsertProjectResult = typeof projectResults.$inferInsert;
