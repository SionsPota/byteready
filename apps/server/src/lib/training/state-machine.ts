export type InterviewState =
  | 'IDLE'
  | 'SELF_INTRO'
  | 'PROJECT_SINGLE_1'
  | 'PROJECT_SINGLE_2'
  | 'PROJECT_CROSS'
  | 'QNA_TECH'
  | 'QNA_ALGO'
  | 'QNA_SCENE'
  | 'END'

export type InterviewPhase = 'self_intro' | 'project_single' | 'project_cross' | 'q_and_a'

export const STATE_PHASE_MAP: Record<InterviewState, InterviewPhase | null> = {
  IDLE: null,
  SELF_INTRO: 'self_intro',
  PROJECT_SINGLE_1: 'project_single',
  PROJECT_SINGLE_2: 'project_single',
  PROJECT_CROSS: 'project_cross',
  QNA_TECH: 'q_and_a',
  QNA_ALGO: 'q_and_a',
  QNA_SCENE: 'q_and_a',
  END: null,
}

export interface ProjectBrief {
  id: string
  name: string
  summary?: string
  role?: string
  keywords?: string[]
}

export interface StateContext {
  position: string
  targetCompany?: string
  jobDescription?: string
  resumeSummary?: string
  skills?: string[]
  totalTurns: number
  elapsedMinutes: number
  currentProject?: ProjectBrief
  projectsDiscussed: string[]
  selectedProjects?: ProjectBrief[]
  topicsCovered: string[]
  currentTopic?: string
  followUpCount: number
}

// 有效状态转换图
const VALID_TRANSITIONS: Record<InterviewState, InterviewState[]> = {
  IDLE: ['SELF_INTRO'],
  SELF_INTRO: ['PROJECT_SINGLE_1'],
  PROJECT_SINGLE_1: ['PROJECT_SINGLE_2', 'PROJECT_CROSS'],
  PROJECT_SINGLE_2: ['PROJECT_CROSS'],
  PROJECT_CROSS: ['QNA_TECH'],
  QNA_TECH: ['QNA_ALGO', 'END'],
  QNA_ALGO: ['QNA_SCENE', 'END'],
  QNA_SCENE: ['QNA_TECH', 'END'],
  END: [],
}

export const canTransition = (from: InterviewState, to: InterviewState): boolean => {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export type TrainingType = 'full' | 'self_intro' | 'project_qa' | 'random_qa'

// 每种训练类型允许的状态范围
const TYPE_ALLOWED_STATES: Record<TrainingType, InterviewState[]> = {
  full: ['SELF_INTRO', 'PROJECT_SINGLE_1', 'PROJECT_SINGLE_2', 'PROJECT_CROSS', 'QNA_TECH', 'QNA_ALGO', 'QNA_SCENE', 'END'],
  self_intro: ['SELF_INTRO', 'END'],
  project_qa: ['PROJECT_SINGLE_1', 'PROJECT_SINGLE_2', 'PROJECT_CROSS', 'END'],
  random_qa: ['QNA_TECH', 'QNA_ALGO', 'QNA_SCENE', 'END'],
}

export const getInitialStateForType = (type: TrainingType): InterviewState => {
  switch (type) {
    case 'self_intro': return 'SELF_INTRO'
    case 'project_qa': return 'PROJECT_SINGLE_1'
    case 'random_qa': return 'QNA_TECH'
    case 'full': return 'SELF_INTRO'
  }
}

export const isStateAllowedForType = (state: InterviewState, type: TrainingType): boolean => {
  return TYPE_ALLOWED_STATES[type]?.includes(state) ?? false
}

export const getNextState = (
  current: InterviewState,
  context: { hasSecondProject?: boolean; elapsedMinutes?: number; type?: TrainingType }
): InterviewState => {
  const type = context.type ?? 'full'

  // 超时强制结束
  if ((context.elapsedMinutes ?? 0) >= 45) return 'END'

  let next: InterviewState
  switch (current) {
    case 'SELF_INTRO':
      next = 'PROJECT_SINGLE_1'
      break
    case 'PROJECT_SINGLE_1':
      next = context.hasSecondProject ? 'PROJECT_SINGLE_2' : 'PROJECT_CROSS'
      break
    case 'PROJECT_SINGLE_2':
      next = 'PROJECT_CROSS'
      break
    case 'PROJECT_CROSS':
      next = 'QNA_TECH'
      break
    case 'QNA_TECH':
      next = 'QNA_ALGO'
      break
    case 'QNA_ALGO':
      next = 'QNA_SCENE'
      break
    case 'QNA_SCENE':
      next = 'QNA_TECH'
      break
    default:
      return 'END'
  }

  // 如果下一个状态不在允许范围内，直接结束
  if (!isStateAllowedForType(next, type)) {
    return 'END'
  }
  return next
}

// 每个状态的追问轮数限制
export const STATE_FOLLOWUP_LIMITS: Record<InterviewState, number> = {
  IDLE: 0,
  SELF_INTRO: 0,
  PROJECT_SINGLE_1: 5,
  PROJECT_SINGLE_2: 5,
  PROJECT_CROSS: 4,
  QNA_TECH: 5,
  QNA_ALGO: 5,
  QNA_SCENE: 5,
  END: 0,
}

export const shouldTransition = (state: InterviewState, followUpCount: number): boolean => {
  const limit = STATE_FOLLOWUP_LIMITS[state]
  if (limit === 0) return true // SELF_INTRO 直接过渡
  return followUpCount >= limit
}

// 状态对应的过渡语
export const TRANSITION_MESSAGES: Record<InterviewState, string> = {
  IDLE: '面试即将开始。',
  SELF_INTRO: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。',
  PROJECT_SINGLE_1: '好的，我们再聊聊另一个项目。',
  PROJECT_SINGLE_2: '很好。现在我想把几个项目放在一起对比着问问。',
  PROJECT_CROSS: '项目部分我们就聊到这里。接下来进入技术问答环节。',
  QNA_TECH: '基础概念掌握得不错。我们来看一道算法题。',
  QNA_ALGO: '算法部分聊完了。我们来聊一个场景设计题。',
  QNA_SCENE: '设计思路清晰。我们回到基础知识，再问几个深入的问题。',
  END: '今天的面试就到这里，感谢你的时间。',
}

// 生成 LLM system prompt
export function renderSystemPrompt(state: InterviewState, ctx: StateContext): string {
  const phase = STATE_PHASE_MAP[state]

  let prompt = `你是 ${ctx.position} 岗位的资深面试官。\n`

  if (ctx.targetCompany) {
    prompt += `目标公司倾向：${ctx.targetCompany}\n`
  }

  if (ctx.jobDescription) {
    prompt += `岗位描述（JD）：${ctx.jobDescription}\n`
  }

  if (ctx.resumeSummary) {
    prompt += `候选人简历摘要：${ctx.resumeSummary}\n`
  }

  if (ctx.skills && ctx.skills.length > 0) {
    prompt += `候选人技能：${ctx.skills.join('、')}\n`
  }

  prompt += `已进行的对话轮次：${ctx.totalTurns}\n`
  prompt += `当前时间：${ctx.elapsedMinutes} / 45分钟\n`

  // 状态级上下文
  prompt += `\n当前阶段：${phase ?? '已结束'}\n`

  if (state === 'SELF_INTRO') {
    prompt += `instruction: 请候选人进行自我介绍，不要打断，不要提问。介绍结束后给出简短过渡语。\n`
    prompt += `过渡语示例："感谢你的介绍，接下来我们聊聊你的项目经历。"\n`
  }

  if ((state === 'PROJECT_SINGLE_1' || state === 'PROJECT_SINGLE_2') && ctx.currentProject) {
    prompt += `当前项目：${ctx.currentProject.name}\n`
    if (ctx.currentProject.summary) {
      prompt += `项目概述：${ctx.currentProject.summary}\n`
    }
    if (ctx.currentProject.role) {
      prompt += `担任角色：${ctx.currentProject.role}\n`
    }
    if (ctx.currentProject.keywords && ctx.currentProject.keywords.length > 0) {
      prompt += `技术关键词：${ctx.currentProject.keywords.join('、')}\n`
    }
    prompt += `已聊过的项目：${ctx.projectsDiscussed.join('、') || '无'}\n`
    prompt += `instruction: 围绕当前项目进行深度追问。每轮追问应比之前更深入，测试候选人的技术深度和 Ownership。\n`
    if (state === 'PROJECT_SINGLE_2') {
      prompt += `注意与上一个项目的对比空间（如技术选型差异）。\n`
    }
  }

  if (state === 'PROJECT_CROSS' && ctx.selectedProjects && ctx.selectedProjects.length > 0) {
    prompt += `选中的项目：${ctx.selectedProjects.map((p) => p.name).join('、')}\n`
    prompt += `instruction: 选 1-2 个项目进行关联提问。考察候选人跨项目的架构视野、技术迁移能力、权衡思维。问题形式：对比、关联、假设迁移。\n`
    prompt += `示例："Project A 用了 Redis，Project B 用了 Kafka，如果让你把 Project A 的缓存层换成 Kafka，你会怎么设计？"\n`
  }

  if (state.startsWith('QNA_')) {
    const topicMap: Record<string, string> = {
      QNA_TECH: '八股文（技术基础）',
      QNA_ALGO: '算法',
      QNA_SCENE: '场景设计',
    }
    prompt += `当前主题：${topicMap[state] ?? '技术问答'}\n`
    prompt += `已覆盖的主题：${ctx.topicsCovered.join('、') || '无'}\n`

    if (state === 'QNA_TECH') {
      prompt += `instruction: 从八股文题库抽题，围绕岗位核心技术栈提问。追问应层层递进：概念→原理→应用→边界条件。\n`
    } else if (state === 'QNA_ALGO') {
      prompt += `instruction: 从算法题库抽题。考察候选人的编码思维、复杂度分析、优化意识。\n`
    } else if (state === 'QNA_SCENE') {
      prompt += `instruction: 场景设计题。给出一个真实业务场景，让候选人设计系统架构。追问围绕：需求分析→架构选型→扩展性→容错。\n`
    }
  }

  prompt += `\n## 追问准则\n`
  prompt += `1. 当前阶段已追问 ${ctx.followUpCount} 轮，限制 ${STATE_FOLLOWUP_LIMITS[state]} 轮\n`
  prompt += `2. 候选人答得深 → 进一步技术追问；答得浅 → 引导补充\n`
  prompt += `3. 不要照本宣科，做"压力测试"型追问\n`
  prompt += `4. 用中文，中英技术术语保持英文原词\n`
  prompt += `5. 到达轮次限制时给出过渡语，引导到下一阶段\n`

  return prompt
}

// 题库主题映射
export const STATE_TOPIC_MAP: Record<string, string> = {
  QNA_TECH: 'bagua',
  QNA_ALGO: 'algorithm',
  QNA_SCENE: 'scene',
}
