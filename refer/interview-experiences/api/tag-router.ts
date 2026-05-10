import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tags } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const tagRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(tags).orderBy(desc(tags.createdAt));
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [tag] = await db.select().from(tags).where(eq(tags.id, input.id));
      return tag || null;
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().optional(),
        category: z.enum(["tech", "process", "company", "role", "other"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [tag] = await db.insert(tags).values({
        name: input.name,
        color: input.color || "#A855F7",
        category: input.category || "other",
      });
      return tag;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(tags).where(eq(tags.id, input.id));
      return { success: true };
    }),

  stats: publicQuery.query(async () => {
    const db = getDb();
    const allTags = await db.select().from(tags);
    const byCategory = allTags.reduce(
      (acc, tag) => {
        const cat = tag.category || "other";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return { total: allTags.length, byCategory };
  }),
});
