import { z } from 'zod'

// ========== 基础 ==========

export const emailSchema = z.string().email('邮箱格式不正确')
export const passwordSchema = z.string().min(6, '密码至少 6 位').max(128, '密码最长 128 位')

// ========== 认证 ==========

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, '姓名不能为空').max(64, '姓名最长 64 位').optional(),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})
export type LoginInput = z.infer<typeof loginSchema>

// ========== 简历 ==========

export const resumeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  raw_text: z.string().min(1),
  source_format: z.enum(['pdf', 'docx', 'paste']),
})
export type ResumeCreateInput = z.infer<typeof resumeCreateSchema>

export const resumeUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contact_name: z.string().max(100).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  contact_location: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  educations: z.array(z.object({
    school: z.string(),
    major: z.string(),
    degree: z.string(),
    period: z.string(),
  })).optional(),
  experiences: z.array(z.object({
    company: z.string(),
    title: z.string(),
    period: z.string(),
    description: z.string(),
  })).optional(),
  skills: z.array(z.object({
    name: z.string(),
    level: z.string().optional(),
  })).optional(),
  project_ids: z.array(z.string().uuid()).optional(),
})
export type ResumeUpdateInput = z.infer<typeof resumeUpdateSchema>

// ========== 项目 ==========

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  period: z.string().max(100).optional(),
  role: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
})
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  period: z.string().max(100).optional(),
  role: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
})
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>

// ========== 训练 ==========

export const trainingCreateSchema = z.object({
  type: z.enum(['full', 'self_intro', 'project_qa', 'random_qa']).default('full'),
  position: z.string().min(1).max(100),
  target_company: z.string().max(100).optional(),
  job_description: z.string().max(5000).optional(),
  persona_id: z.string().max(100).optional(),
  resume_id: z.string().uuid().optional(),
  project_ids: z.array(z.string().uuid()).optional(),
})
export type TrainingCreateInput = z.infer<typeof trainingCreateSchema>

// ========== 题库 ==========

export const categorySchema = z.enum(['bagua', 'project', 'algorithm', 'scene'])

export const questionFilterSchema = z.object({
  position: z.string().max(100).optional(),
  category: categorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ========== 复盘 ==========

export const reviewCreateSchema = z.object({
  type: z.enum(['interview', 'project', 'custom']),
  target_id: z.string().min(1),
  content: z.string().min(1).optional(),
})
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>

// ========== 评分维度 ==========

export const axisSchema = z.enum([
  '专业知识深度',
  '项目复述质量',
  '表达与结构',
  '逻辑与问题解决',
  '沟通自然度',
])

// ========== V1 兼容（将在 Phase 2 移除）==========

/** @deprecated 使用 trainingCreateSchema */
export const interviewCreateSchema = trainingCreateSchema
/** @deprecated 使用 TrainingCreateInput */
export type InterviewCreateInput = TrainingCreateInput

/** @deprecated V2 已移除职级 */
export const levelSchema = z.enum(['junior', 'mid', 'senior', 'expert'])

/** @deprecated 使用 projectUpdateSchema */
export const resumeProjectUpdateSchema = projectUpdateSchema
/** @deprecated 使用 ProjectUpdateInput */
export type ResumeProjectUpdateInput = ProjectUpdateInput
