import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { crawlTasks } from "@db/schema";
import {
  crawlInterview,
  createCrawlTask,
  saveCrawlResult,
  detectPlatform,
  getPlatformName,
} from "./lib/crawler";
import { eq, desc } from "drizzle-orm";

export const crawlRouter = createRouter({
  // 提交爬取任务
  submit: publicQuery
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const platform = detectPlatform(input.url);
      const taskId = await createCrawlTask(input.url);
      return {
        taskId,
        platform,
        platformName: getPlatformName(platform),
        status: "pending",
      };
    }),

  // 执行爬取（异步任务）
  execute: publicQuery
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(crawlTasks)
        .where(eq(crawlTasks.id, input.taskId));

      if (!task) {
        return { success: false, error: "任务不存在" };
      }

      const result = await crawlInterview(task.sourceUrl, input.taskId);

      return {
        success: result.success,
        title: result.title,
        content: result.content,
        platform: result.platform,
        extractedCompany: result.extractedCompany,
        extractedPosition: result.extractedPosition,
        matchedCompanyId: result.matchedCompanyId,
        matchedTagIds: result.matchedTagIds,
        error: result.error,
      };
    }),

  // 保存爬取结果为面试经历
  save: publicQuery
    .input(
      z.object({
        taskId: z.number(),
        companyId: z.number(),
        title: z.string().min(1),
        content: z.string().min(1),
        position: z.string().optional(),
        result: z.enum(["passed", "failed", "pending", "ghosted"]).optional(),
        difficulty: z.number().min(1).max(5).optional(),
        tagIds: z.array(z.number()).optional(),
        sourceUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const interviewId = await saveCrawlResult(input.taskId, {
        companyId: input.companyId,
        title: input.title,
        content: input.content,
        position: input.position,
        result: input.result,
        difficulty: input.difficulty,
        tagIds: input.tagIds,
      });

      // 更新sourceUrl
      if (input.sourceUrl) {
        const db = getDb();
        const { interviews } = await import("@db/schema");
        await db
          .update(interviews)
          .set({ sourceUrl: input.sourceUrl })
          .where(eq(interviews.id, interviewId));
      }

      return { success: true, interviewId };
    }),

  // 获取任务列表
  list: publicQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(crawlTasks)
        .orderBy(desc(crawlTasks.createdAt))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);
    }),

  // 获取单个任务
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(crawlTasks)
        .where(eq(crawlTasks.id, input.id));
      return task || null;
    }),

  // 删除任务
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(crawlTasks).where(eq(crawlTasks.id, input.id));
      return { success: true };
    }),

  // 获取支持的 platforms
  platforms: publicQuery.query(() => {
    return [
      { key: "nowcoder", name: "牛客网", pattern: "nowcoder.com", example: "https://www.nowcoder.com/discuss/1234567" },
      { key: "zhihu", name: "知乎", pattern: "zhihu.com", example: "https://zhuanlan.zhihu.com/p/12345678" },
      { key: "xiaohongshu", name: "小红书", pattern: "xiaohongshu.com", example: "https://www.xiaohongshu.com/explore/abc123" },
      { key: "v2ex", name: "V2EX", pattern: "v2ex.com", example: "https://www.v2ex.com/t/123456" },
    ];
  }),

  // 批量爬取（多个URL）
  batchSubmit: publicQuery
    .input(z.object({ urls: z.array(z.string().url()) }))
    .mutation(async ({ input }) => {
      const results = [];
      for (const url of input.urls) {
        const platform = detectPlatform(url);
        const taskId = await createCrawlTask(url);
        results.push({ taskId, url, platform, platformName: getPlatformName(platform) });
      }
      return results;
    }),
});
