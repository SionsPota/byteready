import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
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

// 公司表
export const companies = mysqlTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logo: text("logo"),
  industry: varchar("industry", { length: 100 }),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#6366F1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// 面试经历表
export const interviews = mysqlTable("interviews", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  sourceUrl: text("sourceUrl"),
  position: varchar("position", { length: 255 }),
  interviewDate: timestamp("interviewDate"),
  result: mysqlEnum("result", ["passed", "failed", "pending", "ghosted"]).default("pending"),
  difficulty: int("difficulty").default(3),
  views: int("views").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

// 标签表
export const tags = mysqlTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 20 }).default("#A855F7"),
  category: mysqlEnum("category", ["tech", "process", "company", "role", "other"]).default("other"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// 面试经历-标签关联表
export const interviewTags = mysqlTable("interview_tags", {
  id: serial("id").primaryKey(),
  interviewId: bigint("interviewId", { mode: "number", unsigned: true }).notNull(),
  tagId: bigint("tagId", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InterviewTag = typeof interviewTags.$inferSelect;
export type InsertInterviewTag = typeof interviewTags.$inferInsert;

// 爬虫任务表
export const crawlTasks = mysqlTable("crawl_tasks", {
  id: serial("id").primaryKey(),
  sourceUrl: text("sourceUrl").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending"),
  title: varchar("title", { length: 500 }),
  content: text("content"),
  extractedCompany: varchar("extractedCompany", { length: 255 }),
  extractedPosition: varchar("extractedPosition", { length: 255 }),
  extractedTags: text("extractedTags"),
  interviewId: bigint("interviewId", { mode: "number", unsigned: true }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type CrawlTask = typeof crawlTasks.$inferSelect;
export type InsertCrawlTask = typeof crawlTasks.$inferInsert;
