import { relations } from "drizzle-orm";
import { companies, interviews, tags, interviewTags, crawlTasks } from "./schema";

export const companiesRelations = relations(companies, ({ many }) => ({
  interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  company: one(companies, {
    fields: [interviews.companyId],
    references: [companies.id],
  }),
  interviewTags: many(interviewTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  interviewTags: many(interviewTags),
}));

export const interviewTagsRelations = relations(interviewTags, ({ one }) => ({
  interview: one(interviews, {
    fields: [interviewTags.interviewId],
    references: [interviews.id],
  }),
  tag: one(tags, {
    fields: [interviewTags.tagId],
    references: [tags.id],
  }),
}));

export const crawlTasksRelations = relations(crawlTasks, ({ one }) => ({
  interview: one(interviews, {
    fields: [crawlTasks.interviewId],
    references: [interviews.id],
  }),
}));
