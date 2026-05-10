import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { companies } from "@db/schema";
import { eq, like, desc } from "drizzle-orm";

export const companyRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(companies).orderBy(desc(companies.createdAt));
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, input.id));
      return company || null;
    }),

  search: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(companies)
        .where(like(companies.name, `%${input.query}%`))
        .orderBy(desc(companies.createdAt));
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        logo: z.string().optional(),
        industry: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [company] = await db.insert(companies).values({
        name: input.name,
        logo: input.logo || null,
        industry: input.industry || null,
        description: input.description || null,
        color: input.color || "#6366F1",
      });
      return company;
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        logo: z.string().optional(),
        industry: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(companies).set(data).where(eq(companies.id, id));
      const [updated] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, id));
      return updated;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(companies).where(eq(companies.id, input.id));
      return { success: true };
    }),

  stats: publicQuery.query(async () => {
    const db = getDb();
    const allCompanies = await db.select().from(companies);
    const total = allCompanies.length;
    return { total };
  }),
});
