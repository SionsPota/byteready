import { authRouter } from "./auth-router";
import { companyRouter } from "./company-router";
import { interviewRouter } from "./interview-router";
import { tagRouter } from "./tag-router";
import { crawlRouter } from "./crawl-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  company: companyRouter,
  interview: interviewRouter,
  tag: tagRouter,
  crawl: crawlRouter,
});

export type AppRouter = typeof appRouter;
