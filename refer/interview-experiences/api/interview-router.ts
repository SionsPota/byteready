import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { interviews, tags, interviewTags, companies } from "@db/schema";
import { eq, like, sql, desc, and, or, inArray } from "drizzle-orm";

export const interviewRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          companyId: z.number().optional(),
          tagIds: z.array(z.number()).optional(),
          search: z.string().optional(),
          result: z.enum(["passed", "failed", "pending", "ghosted"]).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [];

      if (input?.companyId) {
        filters.push(eq(interviews.companyId, input.companyId));
      }
      if (input?.result) {
        filters.push(eq(interviews.result, input.result));
      }
      if (input?.search) {
        filters.push(
          or(
            like(interviews.title, `%${input.search}%`),
            like(interviews.content, `%${input.search}%`),
            like(interviews.position, `%${input.search}%`)
          )
        );
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const results = await db
        .select({
          id: interviews.id,
          companyId: interviews.companyId,
          title: interviews.title,
          content: interviews.content,
          sourceUrl: interviews.sourceUrl,
          position: interviews.position,
          interviewDate: interviews.interviewDate,
          result: interviews.result,
          difficulty: interviews.difficulty,
          views: interviews.views,
          createdAt: interviews.createdAt,
          updatedAt: interviews.updatedAt,
          companyName: companies.name,
          companyColor: companies.color,
        })
        .from(interviews)
        .leftJoin(companies, eq(interviews.companyId, companies.id))
        .where(whereClause)
        .orderBy(desc(interviews.createdAt))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);

      // Get tags for each interview
      const interviewIds = results.map((r) => r.id);
      let tagsMap: Record<number, Array<{ id: number; name: string; color: string }>> = {};

      if (interviewIds.length > 0) {
        const tagResults = await db
          .select({
            interviewId: interviewTags.interviewId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(interviewTags)
          .innerJoin(tags, eq(interviewTags.tagId, tags.id))
          .where(inArray(interviewTags.interviewId, interviewIds));

        tagsMap = tagResults.reduce(
          (acc, row) => {
            if (!acc[row.interviewId]) acc[row.interviewId] = [];
            acc[row.interviewId].push({
              id: row.tagId,
              name: row.tagName,
              color: row.tagColor || "#A855F7",
            });
            return acc;
          },
          {} as Record<number, Array<{ id: number; name: string; color: string }>>
        );
      }

      return results.map((r) => ({
        ...r,
        tags: tagsMap[r.id] || [],
      }));
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [interview] = await db
        .select({
          id: interviews.id,
          companyId: interviews.companyId,
          title: interviews.title,
          content: interviews.content,
          sourceUrl: interviews.sourceUrl,
          position: interviews.position,
          interviewDate: interviews.interviewDate,
          result: interviews.result,
          difficulty: interviews.difficulty,
          views: interviews.views,
          createdAt: interviews.createdAt,
          updatedAt: interviews.updatedAt,
          companyName: companies.name,
          companyColor: companies.color,
        })
        .from(interviews)
        .leftJoin(companies, eq(interviews.companyId, companies.id))
        .where(eq(interviews.id, input.id));

      if (!interview) return null;

      const tagResults = await db
        .select({
          tagId: tags.id,
          tagName: tags.name,
          tagColor: tags.color,
        })
        .from(interviewTags)
        .innerJoin(tags, eq(interviewTags.tagId, tags.id))
        .where(eq(interviewTags.interviewId, input.id));

      return {
        ...interview,
        tags: tagResults.map((t) => ({
          id: t.tagId,
          name: t.tagName,
          color: t.tagColor,
        })),
      };
    }),

  create: publicQuery
    .input(
      z.object({
        companyId: z.number(),
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        sourceUrl: z.string().optional(),
        position: z.string().optional(),
        interviewDate: z.string().optional(),
        result: z.enum(["passed", "failed", "pending", "ghosted"]).optional(),
        difficulty: z.number().min(1).max(5).optional(),
        tagIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { tagIds, ...interviewData } = input;

      const [interview] = await db.insert(interviews).values({
        companyId: interviewData.companyId,
        title: interviewData.title,
        content: interviewData.content,
        sourceUrl: interviewData.sourceUrl || null,
        position: interviewData.position || null,
        interviewDate: interviewData.interviewDate
          ? new Date(interviewData.interviewDate)
          : null,
        result: interviewData.result || "pending",
        difficulty: interviewData.difficulty || 3,
      });

      const interviewId = interview.insertId;

      if (tagIds && tagIds.length > 0) {
        await db.insert(interviewTags).values(
          tagIds.map((tagId) => ({
            interviewId,
            tagId,
          }))
        );
      }

      return { id: interviewId, ...interviewData };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        companyId: z.number().optional(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        sourceUrl: z.string().optional(),
        position: z.string().optional(),
        interviewDate: z.string().optional(),
        result: z.enum(["passed", "failed", "pending", "ghosted"]).optional(),
        difficulty: z.number().min(1).max(5).optional(),
        tagIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, tagIds, interviewDate, ...data } = input;

      const updateData: Record<string, unknown> = { ...data };
      if (interviewDate) {
        updateData.interviewDate = new Date(interviewDate);
      }

      await db.update(interviews).set(updateData).where(eq(interviews.id, id));

      if (tagIds) {
        await db.delete(interviewTags).where(eq(interviewTags.interviewId, id));
        if (tagIds.length > 0) {
          await db
            .insert(interviewTags)
            .values(tagIds.map((tagId) => ({ interviewId: id, tagId })));
        }
      }

      const [updated] = await db
        .select()
        .from(interviews)
        .where(eq(interviews.id, id));
      return updated;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(interviewTags).where(eq(interviewTags.interviewId, input.id));
      await db.delete(interviews).where(eq(interviews.id, input.id));
      return { success: true };
    }),

  incrementViews: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(interviews)
        .set({ views: sql`${interviews.views} + 1` })
        .where(eq(interviews.id, input.id));
      return { success: true };
    }),

  stats: publicQuery.query(async () => {
    const db = getDb();
    const allInterviews = await db.select().from(interviews);
    const total = allInterviews.length;
    const byResult = allInterviews.reduce(
      (acc, iv) => {
        acc[iv.result || "pending"] = (acc[iv.result || "pending"] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const avgDifficulty =
      total > 0
        ? allInterviews.reduce((sum, iv) => sum + (iv.difficulty || 0), 0) / total
        : 0;
    const totalViews = allInterviews.reduce((sum, iv) => sum + (iv.views || 0), 0);

    return { total, byResult, avgDifficulty: Math.round(avgDifficulty * 10) / 10, totalViews };
  }),
});
