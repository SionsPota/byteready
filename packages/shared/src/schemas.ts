import { z } from 'zod'

export const emailSchema = z.string().email('邮箱格式不正确')
export const passwordSchema = z.string().min(6, '密码至少 6 位').max(128, '密码最长 128 位')

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

export const resumeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  raw_text: z.string().min(1),
  source_format: z.enum(['pdf', 'docx', 'paste']),
})
export type ResumeCreateInput = z.infer<typeof resumeCreateSchema>

export const resumeProjectUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  period: z.string().max(100).optional(),
  role: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
})
export type ResumeProjectUpdateInput = z.infer<typeof resumeProjectUpdateSchema>

export const levelSchema = z.enum(['junior', 'mid', 'senior', 'expert'])
export const categorySchema = z.enum(['bagua', 'project', 'algorithm'])

export const interviewCreateSchema = z.object({
  position: z.string().min(1).max(100),
  level: levelSchema,
  target_company: z.string().max(100).optional(),
  resume_id: z.string().uuid().optional(),
})
export type InterviewCreateInput = z.infer<typeof interviewCreateSchema>

export const questionFilterSchema = z.object({
  position: z.string().max(100).optional(),
  level: levelSchema.optional(),
  category: categorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const axisSchema = z.enum([
  '专业知识深度',
  '项目复述质量',
  '表达与结构',
  '逻辑与问题解决',
  '沟通自然度',
])
