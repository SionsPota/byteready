import { authRouter } from "./auth-router";
import { resumeRouter } from "./resume-router";
import { trendRouter } from "./trend-router";
import { projectRouter } from "./project-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  resume: resumeRouter,
  trend: trendRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
