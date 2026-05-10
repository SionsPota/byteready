import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { resumes } from "@db/schema";
import { eq } from "drizzle-orm";

export const resumeRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(resumes).orderBy(resumes.createdAt);
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(resumes).where(eq(resumes.id, input.id));
      return result[0] || null;
    }),

  create: publicQuery
    .input(
      z.object({
        userId: z.number().default(1),
        title: z.string().min(1),
        content: z.string().min(1),
        parsedSkills: z.array(z.string()).default([]),
        targetRole: z.string().optional(),
        experienceLevel: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(resumes).values(input);
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        parsedSkills: z.array(z.string()).optional(),
        targetRole: z.string().optional(),
        experienceLevel: z.string().optional(),
        status: z.enum(["analyzing", "ready", "error"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(resumes).set(data).where(eq(resumes.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(resumes).where(eq(resumes.id, input.id));
      return { success: true };
    }),
});
