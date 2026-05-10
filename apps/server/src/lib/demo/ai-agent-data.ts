import type { DemoAccount } from './seed.ts'

const U = 'b2222222-2222-4222-b222-222222222222'
const R = 'b2222222-2222-4222-b222-222222222223'
const P1 = 'b2222222-2222-4222-b222-222222222221'
const P2 = 'b2222222-2222-4222-b222-222222222222'
const P3 = 'b2222222-2222-4222-b222-222222222223'

// ====== User / Resume / Projects ======

const user = {
  id: U,
  email: 'demo-ai-agent@byteready.com',
  name: '林晓薇',
  password: 'demo123',
}

const resume = {
  id: R,
  title: '林晓薇-AI Agent工程师',
  rawText: `林晓薇
AI Agent工程师 | 2年经验
手机：139-0000-0002 | 邮箱：linxiaowei@example.com | 上海

【教育背景】
上海交通大学 | 计算机科学与技术 | 硕士 | 2021.09 - 2024.06

【工作经历】
智谱AI | AI应用工程师 | 2024.07 - 至今
- 负责企业知识库RAG系统的设计与开发
- 开发多Agent协作框架，支持复杂任务分解与并行执行
- 优化LLM推理链路，降低响应延迟30%

【项目经历】
1. 企业知识库RAG系统（LangChain + Milvus + OpenAI）
   - 设计文档解析pipeline，支持PDF/Word/Markdown多格式
   - 实现多路召回策略：向量检索 + 关键词检索 + 图谱检索
   - 优化Embedding模型，中文问答准确率从72%提升至89%

2. 多Agent协作工作流（CrewAI + FastAPI）
   - 设计任务分解引擎，将复杂查询拆分为子任务DAG
   - 实现Agent间通信协议，支持上下文传递和结果聚合
   - 开发可视化编排界面，支持拖拽式工作流设计

3. 智能客服质检系统（BERT + FastAPI）
   - 微调BERT模型用于客服对话意图识别和情绪分析
   - 开发质检规则引擎，支持自定义评分维度
   - 集成大模型生成改进建议，辅助客服人员培训

【技术栈】
Python / LangChain / LlamaIndex / FastAPI / PyTorch / Transformers / Milvus / Redis / Docker / Kubernetes`,
  sourceFormat: 'paste' as const,
  contactName: '林晓薇',
  contactEmail: 'linxiaowei@example.com',
  contactPhone: '139-0000-0002',
  contactLocation: '上海',
  summary: '2年AI工程经验，专注LLM应用开发和Agent系统设计。有完整的RAG知识库和多Agent协作框架建设经验。',
  educations: [{ school: '上海交通大学', major: '计算机科学与技术', degree: '硕士', period: '2021.09 - 2024.06' }],
  experiences: [
    { company: '智谱AI', title: 'AI应用工程师', period: '2024.07 - 至今', description: '负责企业知识库RAG系统的设计与开发' },
  ],
  skills: [
    { name: 'Python', level: '精通' },
    { name: 'LangChain', level: '精通' },
    { name: 'FastAPI', level: '熟练' },
    { name: 'PyTorch', level: '熟练' },
    { name: 'Docker/K8s', level: '了解' },
  ],
}

const projects = [
  {
    id: P1,
    name: '企业知识库RAG系统',
    period: '2024.08 - 2025.02',
    role: '核心开发',
    summary: '基于LangChain和Milvus的企业级RAG知识库，支持多格式文档解析和多路召回',
    keywords: ['LangChain', 'Milvus', 'RAG', 'OpenAI', '文档解析'],
  },
  {
    id: P2,
    name: '多Agent协作工作流',
    period: '2024.10 - 2025.05',
    role: '架构设计',
    summary: '支持复杂任务分解的Agent协作框架，可视化编排，上下文传递与结果聚合',
    keywords: ['CrewAI', 'FastAPI', 'Agent', 'DAG', '可视化'],
  },
  {
    id: P3,
    name: '智能客服质检系统',
    period: '2025.01 - 2025.07',
    role: '模型负责人',
    summary: '基于BERT的客服对话质检系统，意图识别+情绪分析+大模型改进建议',
    keywords: ['BERT', 'FastAPI', 'NLP', '微调', '质检'],
  },
]

// ====== Helper: timestamp ======
const T = (s: string) => new Date(s).getTime()

// ====== Helper: score builder ======
function scores(
  prof: number,
  proj: number,
  expr: number,
  logic: number,
  comm: number,
): Array<{ dimension: string; score: number; weight: number; weighted: number }> {
  const dims = ['专业知识深度', '项目复述质量', '表达与结构', '逻辑与问题解决', '沟通自然度']
  const vals = [prof, proj, expr, logic, comm]
  return dims.map((d, i) => {
    const v = vals[i] ?? 0
    return { dimension: d, score: v, weight: 0.2, weighted: +(v * 0.2).toFixed(3) }
  })
}

function total(scoresArr: ReturnType<typeof scores>): number {
  return +scoresArr.reduce((s, v) => s + v.weighted, 0).toFixed(2)
}

// ====== Session 1: 整面 #1 (低分 2.5) ======
const S1 = 'a0000001-0000-4000-b000-000000000001'
const s1 = {
  id: S1,
  type: 'full' as const,
  position: 'ai',
  targetCompany: '智谱AI',
  jobDescription: 'AI Agent工程师，负责大模型应用产品开发',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-04-28T10:00:00'),
  endedAt: T('2026-04-28T10:22:00'),
  createdAt: T('2026-04-28T09:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '你好，我叫林晓薇，上海交大计算机硕士毕业，现在在智谱做AI应用开发。主要做一些RAG相关的项目，比如知识库、问答系统。技术栈主要是Python和LangChain。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '好的，我介绍一下知识库RAG系统。这个项目是给企业用的，可以上传文档然后问答。技术栈是LangChain + Milvus + OpenAI。我主要负责文档解析和检索这部分。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '文档解析是怎么做的？PDF这种复杂格式怎么处理？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: 'PDF用的PyPDF2读取文本，然后分段。Word用python-docx。分段用的是固定长度，比如每500字一段。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '检索部分除了向量检索，还有没有其他的召回方式？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们一开始只有向量检索，后来加了关键词检索。向量用的是OpenAI的Embedding模型，关键词检索用的Elasticsearch。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '另一个是多Agent协作项目。就是有多个AI Agent一起完成任务，比如一个负责搜索，一个负责分析，一个负责写报告。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_followup' as const, text: 'Agent之间是怎么通信的？', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'candidate' as const, text: '用的是CrewAI框架，它内置了Agent通信机制。每个Agent有角色和任务描述，框架会自动安排执行顺序。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: 'RAG系统和Agent系统都需要和大模型交互，你们在提示工程上有什么共通的经验吗？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '都会用一些prompt技巧，比如给模型设定角色、加 few-shot 示例。RAG的prompt会包含检索到的文档片段，Agent的prompt会有任务描述。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_main' as const, text: '项目部分我们就聊到这里。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '解释一下RAG的完整流程，以及每个环节可能的问题和优化方向。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: 'RAG就是检索增强生成，流程是：文档解析→分段→向量化→存储→检索→生成回答。问题嘛...检索可能召回不相关的内容，生成可能 hallucination。优化可以用更好的Embedding模型、重排序、加引用。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '实现一个滑动窗口，从长文本中截取最相关的段落来回答用户问题，要求时间和空间复杂度都尽量优。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '可以用一个固定大小的窗口在文本上滑动，计算每个窗口和问题的相似度，取最高的。相似度用cosine similarity，向量可以用TF-IDF。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个支持多轮对话的记忆管理系统，要求支持短期记忆、长期记忆和语义检索。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '短期记忆用Redis存储最近几轮对话，长期记忆用向量数据库存储关键信息。语义检索用Embedding模型把对话转成向量然后检索。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: scores(2.0, 2.0, 2.5, 2.0, 2.5),
      totalScore: total(scores(2.0, 2.0, 2.5, 2.0, 2.5)),
      evaluation: '自我介绍过于简单，缺少重点和亮点。没有清晰表达技术方向和职业目标。',
      interviewerReflection: '候选人准备不足，表达比较随意。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '准备结构化自我介绍，包含教育背景、核心技能、代表性项目、职业目标' },
        { priority: 'high' as const, suggestion: '突出与目标岗位相关的技术经验和成果' },
      ],
    },
    {
      phaseType: 'project_qa' as const, phaseIndex: 1,
      scores: scores(2.5, 2.5, 2.5, 2.5, 3.0),
      totalScore: total(scores(2.5, 2.5, 2.5, 2.5, 3.0)),
      evaluation: '项目描述停留在功能层面，缺乏技术深度。追问时只能回答"用了什么"，不能解释"为什么"和"怎么做"。',
      interviewerReflection: '候选人对项目有一定参与，但缺乏系统性思考和复盘。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '每个项目准备3个技术难点、解决方案和量化结果' },
        { priority: 'high' as const, suggestion: '深入理解所用技术的原理，而不是停留在使用层面' },
      ],
    },
    {
      phaseType: 'random_qa' as const, phaseIndex: 2,
      scores: scores(3.0, 2.5, 3.0, 2.5, 3.0),
      totalScore: total(scores(3.0, 2.5, 3.0, 2.5, 3.0)),
      evaluation: '基础概念有一定了解，但描述不够系统和深入。算法题只给了思路没有代码。场景设计题过于简化。',
      interviewerReflection: '候选人学习能力尚可，但需要加强系统性知识整理和编码实践。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '系统学习RAG完整链路，包括预处理、检索策略、重排序、生成优化' },
        { priority: 'high' as const, suggestion: '算法题要写出完整代码' },
      ],
    },
  ],
  fullReview: {
    phaseScoresSummary: [
      { phaseType: 'self_intro', score: total(scores(2.0, 2.0, 2.5, 2.0, 2.5)), duration: 3 },
      { phaseType: 'project_qa', score: total(scores(2.5, 2.5, 2.5, 2.5, 3.0)), duration: 10 },
      { phaseType: 'random_qa', score: total(scores(3.0, 2.5, 3.0, 2.5, 3.0)), duration: 9 },
    ],
    coherenceScore: 2.5,
    jdMatchScore: 2.5,
    overallPersona: '有AI工程经验但面试准备不足的新人工程师，需要系统性提升表达和技术深度。',
    consolidatedImprovements: [
      { priority: 'high' as const, sourcePhases: ['self_intro', 'project_qa'], suggestion: '系统准备自我介绍和项目复盘材料' },
      { priority: 'high' as const, sourcePhases: ['random_qa'], suggestion: '深入学习RAG和Agent的底层原理' },
    ],
    overallEvaluation: '本次面试表现偏弱。候选人有AI工程背景，但在面试表达、技术深度和系统性思考方面存在明显不足。建议加强面试准备和基础知识学习。',
    overallScore: 2.5,
  },
}

// ====== Session 2: 整面 #2 (中分 3.2) ======
const S2 = 'a0000002-0000-4000-b000-000000000002'
const s2Intro = scores(3.0, 3.0, 3.2, 3.0, 3.5)
const s2Proj = scores(3.2, 3.5, 3.0, 3.2, 3.5)
const s2Qna = scores(3.5, 3.0, 3.2, 3.2, 3.5)
const s2 = {
  id: S2,
  type: 'full' as const,
  position: 'ai',
  targetCompany: 'MiniMax',
  jobDescription: 'AI应用工程师，负责大模型产品落地',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-01T14:00:00'),
  endedAt: T('2026-05-01T14:28:00'),
  createdAt: T('2026-05-01T13:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '面试官好，我叫林晓薇，上海交通大学计算机科学与技术硕士，目前在智谱AI担任AI应用工程师。过去两年我专注LLM应用开发，主导了企业知识库RAG系统的设计，将中文问答准确率从72%提升到89%。技术栈以Python生态为主，包括LangChain、LlamaIndex、FastAPI和PyTorch。我对Agent系统设计和RAG优化方向特别感兴趣。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '好的，我详细介绍企业知识库RAG系统。这个项目的服务对象是企业内部员工，帮助他们从海量文档中快速找到答案。系统需要处理PDF、Word、Markdown等多种格式，支持多路召回和答案生成。我的核心职责是设计文档解析pipeline和检索策略优化。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: 'PDF解析中表格和图文混排的情况你们是怎么处理的？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们采用了分层解析策略。纯文本用PyPDF2和pdfplumber，图文混排页面用PaddleOCR做版面分析，识别标题、正文、表格和图片区域。表格单独提取后转成Markdown格式，保留行列关系。对于扫描版PDF，先用OCR识别文字，再做版面分析。解析结果用统一的Document对象封装，包含文本内容、位置信息和元素类型。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '多路召回到底是哪几路？每路的适用场景和权重怎么确定？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '三路召回：向量检索、关键词检索和图谱检索。向量检索适合语义相关的问题，关键词检索适合精确匹配的实体查询，图谱检索适合需要关联推理的复杂问题。权重用混合排序模型动态调整，在训练集上学习各路的权重系数。实际部署中向量检索召回率最高占60%，关键词30%，图谱10%。重排序用Cross-Encoder做精排，Top3准确率提升了15%。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '我再介绍多Agent协作工作流。这个项目的目标是让多个AI Agent协同完成复杂任务，比如市场调研报告生成。技术栈是CrewAI + FastAPI，我负责架构设计和核心引擎开发。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_followup' as const, text: '任务分解引擎是怎么设计的？怎么决定哪些任务可以并行，哪些必须串行？', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'candidate' as const, text: '我们用DAG来表示任务依赖关系。每个任务节点有输入、输出和依赖列表。拓扑排序后得到执行顺序。没有依赖关系的任务可以并行执行。为了优化执行效率，我们还实现了任务结果缓存，如果某个子任务的结果已经存在，直接复用不重新执行。对于LLM调用这种IO密集型任务，并行可以显著降低总耗时。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: 'RAG系统和Agent系统都需要评估输出质量，你们的评估方法有什么异同？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '共同点是都需要评估相关性和准确性。RAG的评估更侧重检索质量和答案忠实度，指标有召回率、MRR、BLEU和人工评分。Agent的评估更侧重任务完成度和执行效率，指标有任务成功率、步骤合理性、Token消耗和执行时间。RAG的评估相对标准化，有公开数据集可以参考。Agent的评估更复杂，因为任务类型多样，需要设计不同的评估维度。我们正在探索用另一个LLM做自动评估，让模型扮演评估者角色打分。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_main' as const, text: '项目部分我们就聊到这里。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '请详细解释Transformer的注意力机制，以及为什么多头注意力比单头效果更好。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: '注意力机制的核心是计算查询向量Q和键向量K的相似度，加权求和值向量V，得到输出。公式是Attention(Q,K,V)=softmax(QK^T/sqrt(d_k))V。多头注意力将Q、K、V投影到多个子空间，分别做注意力计算后再拼接。比单头好的原因是不同头可以学习到不同的注意力模式，比如有的头关注局部语法，有的头关注长距离依赖。从信息论角度，多头增加了表示空间的表达能力。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '实现一个Top-K频繁项统计系统，支持动态添加元素和查询当前Top-K，要求add和query都尽量快。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '可以用最小堆+哈希表。哈希表记录每个元素的频率，最小堆维护Top-K个元素。add时更新哈希表，如果元素在堆里更新堆，如果频率超过堆顶则替换堆顶。query直接返回堆中元素。add平均O(logK)，query O(K)。如果数据量极大，可以用Count-Min Sketch做近似统计，空间更小。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个支持百万级文档的RAG检索服务，要求低延迟、高召回率，支持实时增量更新。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '我会从四层设计。索引层：文档解析后按语义段落切分，用Embedding模型生成向量，存储到Milvus或Faiss。为了支持实时增量更新，用Milvus的增量插入能力，新文档即时索引。检索层：多路召回+重排序，向量检索召回Top100，BM25召回Top50，合并后Cross-Encoder精排Top10。缓存层：热点查询结果用Redis缓存，TTL根据查询类型动态调整。服务层：FastAPI异步处理，用连接池管理向量数据库连接，支持水平扩展。监控层：采集检索延迟、召回率和用户反馈，自动触发索引重建和模型更新。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: s2Intro,
      totalScore: total(s2Intro),
      evaluation: '自我介绍结构清晰，有量化成果支撑。技术方向表达明确，但可以增加对目标岗位的理解。',
      interviewerReflection: '候选人做了准备，表达流畅，给人留下了不错的第一印象。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '结尾增加对目标公司产品的理解和兴趣表达' },
      ],
    },
    {
      phaseType: 'project_qa' as const, phaseIndex: 1,
      scores: s2Proj,
      totalScore: total(s2Proj),
      evaluation: '项目描述有层次感，技术细节掌握较好。追问时能给出具体的实现方案和量化指标。跨项目对比有一定深度。',
      interviewerReflection: '候选人对项目有深入理解，展现了不错的技术视野。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '补充失败经验和反思' },
      ],
    },
    {
      phaseType: 'random_qa' as const, phaseIndex: 2,
      scores: s2Qna,
      totalScore: total(s2Qna),
      evaluation: '基础概念理解深入，算法题给出了较优解和复杂度分析。场景设计题方案完整，有分层架构思维。',
      interviewerReflection: '候选人基础扎实，学习能力较强。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '系统设计增加容量估算和降级方案' },
      ],
    },
  ],
  fullReview: {
    phaseScoresSummary: [
      { phaseType: 'self_intro', score: total(s2Intro), duration: 4 },
      { phaseType: 'project_qa', score: total(s2Proj), duration: 14 },
      { phaseType: 'random_qa', score: total(s2Qna), duration: 10 },
    ],
    coherenceScore: 3.2,
    jdMatchScore: 3.2,
    overallPersona: '技术扎实、项目经验丰富、表达能力较好的AI工程师。',
    consolidatedImprovements: [
      { priority: 'medium' as const, sourcePhases: ['self_intro'], suggestion: '增加对目标公司的理解' },
      { priority: 'medium' as const, sourcePhases: ['project_qa'], suggestion: '补充失败案例和成长反思' },
    ],
    overallEvaluation: '本次面试表现良好。候选人在项目经验、技术基础和表达能力上都有不错的表现，具备一定的AI工程实践经验。建议在面试准备中增加对公司业务的理解和失败经验的复盘。',
    overallScore: 3.2,
  },
}

// ====== Session 3: 整面 #3 (高分 4.0) ======
const S3 = 'a0000003-0000-4000-b000-000000000003'
const s3Intro = scores(4.0, 3.8, 4.2, 4.0, 4.5)
const s3Proj = scores(4.2, 4.5, 4.0, 4.2, 4.5)
const s3Qna = scores(4.0, 3.8, 4.0, 4.0, 4.2)
const s3 = {
  id: S3,
  type: 'full' as const,
  position: 'ai',
  targetCompany: '月之暗面',
  jobDescription: '高级AI工程师，负责Kimi Agent平台',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-07T10:00:00'),
  endedAt: T('2026-05-07T10:32:00'),
  createdAt: T('2026-05-07T09:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '面试官好，我是林晓薇，上海交通大学计算机科学与技术硕士，目前在智谱AI担任AI应用工程师，2年LLM应用开发经验。我主导了三个核心项目：企业知识库RAG系统将中文问答准确率从72%提升到89%；多Agent协作框架支持复杂任务DAG编排和可视化设计；智能客服质检系统基于BERT微调实现意图识别和情绪分析。我的技术方向聚焦在RAG优化、Agent系统设计和LLM推理链路优化。非常期待能加入月之暗面，在Kimi Agent平台上贡献我的经验和热情。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '好的，我详细介绍企业知识库RAG系统。这是一个面向企业内部的智能问答平台，需要处理百万级文档、支持多格式解析和多路召回。我在项目中负责整体架构设计和检索优化。核心挑战有三个：一是PDF复杂版面的准确解析，二是多路召回的融合排序，三是回答质量的可靠评估。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '你提到回答质量评估，能详细说说你们的评估体系吗？人工评估的成本和一致性怎么解决？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们构建了三层评估体系。自动层用指标评估：上下文召回率、答案忠实度、答案相关性和流畅度。忠实度用NLI模型判断生成内容是否被上下文支持，相关性用Embedding相似度。半自动层用LLM-as-a-Judge，让GPT-4扮演评估员按维度打分，和人工评估的Pearson相关系数达到0.85。人工层是抽样评估，每周每个领域抽50条做人工标注，用于校准自动评估模型。为了降低成本，我们用主动学习策略，优先标注模型不确定的样本，减少了60%的标注量。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: 'RAG系统在处理时间敏感信息时有什么策略？比如公司政策更新了，旧答案怎么处理？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们实现了文档版本管理和增量索引。每个文档有版本号和生效时间戳，解析时保留版本信息。检索时优先返回最新版本的文档片段。对于已经过时的答案，系统在回答末尾加一个时效性提示："本回答基于2025年3月版本的政策文档，请确认是否有更新版本"。另外我们建立了定期扫描机制，检测文档库中超过90天未更新的核心文档，自动提醒管理员确认是否需要更新。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '我再介绍智能客服质检系统。这个项目的需求是自动分析客服对话质量，识别服务问题和改进机会。我从数据标注、模型训练和系统架构三个层面推进。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P3 },
    { kind: 'interviewer_followup' as const, text: 'BERT微调和直接用大模型做质检，你们是怎么权衡的？', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P3 },
    { kind: 'candidate' as const, text: '我们采用了混合策略。BERT微调模型做实时质检，因为它推理快、成本低，可以逐句分析意图和情绪。大模型做深度质检报告生成，因为它理解能力强，可以给出更 nuanced 的改进建议。BERT负责"快而准"的分类任务，大模型负责"深而全"的生成任务。两者结合既保证了实时性，又提升了质检深度。部署上BERT跑在GPU实例上，大模型通过API调用，用异步队列削峰。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P3 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: 'RAG系统和质检系统都需要长文本理解能力，但一个侧重开放域问答，一个侧重对话分析，你在模型选择和优化策略上有什么不同？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '核心差异在于任务类型和上下文长度。RAG是开放域生成任务，需要模型有较强的知识整合和推理能力，所以选用了GPT-4级别的模型。优化策略侧重检索质量，因为再好的生成模型也救不回错误的检索结果。质检是封闭域分类任务，意图类别固定，所以BERT级别就够了。优化策略侧重数据质量和标注一致性，因为分类模型的上限由数据质量决定。另一个差异是上下文处理：RAG的文档可能很长，需要智能切分和上下文压缩；质检的对话有明确轮次结构，可以用特殊token标记说话人角色，帮助模型理解对话流。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_main' as const, text: '项目部分我们就聊到这里。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '请深入分析LoRA和全量微调的优劣势，以及在什么场景下应该选择LoRA。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: 'LoRA的核心思想是低秩适配：冻结预训练权重，只训练两个低秩矩阵的乘积来近似权重的更新。优势是显存占用低、训练速度快、可以部署多个LoRA适配器共享同一个基座模型。劣势是表达能力受秩限制，对于需要彻底改变模型行为的任务可能不够。全量微调可以充分利用模型容量，但成本高、容易过拟合、灾难性遗忘风险大。选择LoRA的场景：数据量较小、计算资源有限、需要快速迭代多个任务适配器、基座模型行为基本满足需求只需微调。选择全量微调的场景：数据量很大、任务与预训练差异极大、有充足计算资源、需要最大化任务性能。实践中我倾向于先用LoRA快速验证，效果不够再考虑全量微调或QLoRA折中。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '实现一个文本去重系统，给定N篇文档，找出所有重复或高度相似的文档对，要求时间复杂度尽量优。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '可以用SimHash+局部敏感哈希。每篇文档提取关键词，计算SimHash指纹。将64位指纹分成4个16位 band，相同band的文档进入同一个桶。候选对用Jaccard相似度或编辑距离精排。建索引时间O(N*L)，L是文档长度。查询时间接近O(1)每篇。如果N很大，可以用MapReduce并行计算。空间复杂度O(N)。另一种方案是用Embedding+向量数据库做近似最近邻搜索，适合语义相似而非字面重复的场景。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个支持千级别Agent并发调度的平台，要求支持动态扩缩容、容错恢复和负载均衡。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '我会从六个维度设计。调度层：基于Kubernetes的HPA做自动扩缩容，用自定义指标如队列深度和平均响应时间触发扩缩容。Agent池化：每个Agent类型维护一个工作池，任务来了分配给空闲Agent，避免每次创建销毁的开销。任务队列：用Redis Stream做优先级队列，支持任务优先级、超时和重试策略。容错层：Agent执行超时或失败时自动重试3次，仍失败则转人工处理。状态持久化：Agent的中间状态定期checkpoint到S3，崩溃后可以恢复到最近状态。负载均衡：用一致性哈希将同类任务分配到不同Pod，避免热点。监控告警：采集Agent吞吐量、延迟、错误率和资源使用率，异常时自动告警和降级。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: s3Intro,
      totalScore: total(s3Intro),
      evaluation: '自我介绍非常优秀，结构完整、重点突出、有量化成果、有目标岗位匹配度表达。展现了强烈的求职意愿和专业自信。',
      interviewerReflection: '候选人做了充分准备，表达清晰有力，给人留下了深刻印象。',
      improvementSuggestions: [
        { priority: 'low' as const, suggestion: '可以增加一个有趣的个人标签' },
      ],
    },
    {
      phaseType: 'project_qa' as const, phaseIndex: 1,
      scores: s3Proj,
      totalScore: total(s3Proj),
      evaluation: '项目描述非常出色，技术深度、架构思考和量化成果都很充分。追问环节展现了扎实的问题分析能力和系统性思维。',
      interviewerReflection: '候选人对项目有深度的ownership，展现了高级工程师的技术视野。',
      improvementSuggestions: [
        { priority: 'low' as const, suggestion: '可以补充一些失败案例和成长反思' },
      ],
    },
    {
      phaseType: 'random_qa' as const, phaseIndex: 2,
      scores: s3Qna,
      totalScore: total(s3Qna),
      evaluation: '基础概念理解深入，算法题给出多种方案并分析了Trade-off。场景设计题展现了系统的架构思维和分层设计能力。',
      interviewerReflection: '候选人基础扎实，技术视野广，学习能力突出。',
      improvementSuggestions: [
        { priority: 'low' as const, suggestion: '增加容量估算和成本分析' },
      ],
    },
  ],
  fullReview: {
    phaseScoresSummary: [
      { phaseType: 'self_intro', score: total(s3Intro), duration: 5 },
      { phaseType: 'project_qa', score: total(s3Proj), duration: 16 },
      { phaseType: 'random_qa', score: total(s3Qna), duration: 11 },
    ],
    coherenceScore: 4.2,
    jdMatchScore: 4.0,
    overallPersona: '技术深度和表达能力俱佳的AI工程师，具备高级岗位的潜力。',
    consolidatedImprovements: [
      { priority: 'low' as const, sourcePhases: ['self_intro'], suggestion: '增加个人标签提升记忆点' },
    ],
    overallEvaluation: '本次面试表现优秀。候选人在所有维度上都有出色的表现，自我介绍清晰有力，项目描述有深度和量化成果，技术基础和架构思维扎实。强烈建议作为strong hire推进。',
    overallScore: 4.0,
  },
}

// ====== Session 4: 自我介绍专项 (3.0) ======
const S4 = 'a0000004-0000-4000-b000-000000000004'
const s4Scores = scores(3.0, 2.5, 3.5, 3.0, 3.5)
const s4 = {
  id: S4,
  type: 'self_intro' as const,
  position: 'ai',
  targetCompany: null,
  jobDescription: null,
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-07T16:00:00'),
  endedAt: T('2026-05-07T16:08:00'),
  createdAt: T('2026-05-07T15:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '面试官好，我是林晓薇，上海交大计算机硕士，目前在智谱AI做AI应用开发。我主要做RAG系统和Agent框架，有2年LLM应用开发经验。技术栈是Python、LangChain、FastAPI。希望能加入贵公司，在AI领域继续深耕。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你在RAG和Agent两个方向都有经验，如果只能选一个深入发展，你会怎么选？', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '我会选Agent方向。因为RAG是Agent的一个组成部分，Agent的想象空间更大，可以处理更复杂的任务。而且Agent领域还在快速演进，有更多创新的机会。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你认为自己在这个方向上的核心优势是什么？', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '我的核心优势是有完整的项目落地经验，从需求分析到架构设计到上线运维都参与过。另外我对LLM的底层原理有比较深入的理解，能更好地设计提示工程和优化推理链路。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'system' as const, text: '自我介绍环节结束。', phase: 'self_intro', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: s4Scores,
      totalScore: total(s4Scores),
      evaluation: '自我介绍基本完整，技术方向明确。但缺少量化成果，对目标岗位匹配度表达不够充分。',
      interviewerReflection: '候选人表达较流畅，但内容可以更丰富。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '增加1-2个量化成果作为亮点' },
        { priority: 'medium' as const, suggestion: '增加对目标岗位的理解和职业诉求' },
      ],
    },
  ],
  fullReview: null,
}

// ====== Session 5: 项目问答专项 (3.5) ======
const S5 = 'a0000005-0000-4000-b000-000000000005'
const s5Scores = scores(3.5, 3.8, 3.2, 3.5, 3.8)
const s5 = {
  id: S5,
  type: 'project_qa' as const,
  position: 'ai',
  targetCompany: '百度',
  jobDescription: 'AI工程师，负责文心一言应用生态',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-09T10:00:00'),
  endedAt: T('2026-05-09T10:18:00'),
  createdAt: T('2026-05-09T09:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。我们来聊聊你的项目经历。', phase: 'project_single', state: 'PROJECT_SINGLE_1' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。我们来聊聊你的项目经历。', phase: 'project_single', state: 'PROJECT_SINGLE_1' },
    { kind: 'candidate' as const, text: '好的，我先介绍企业知识库RAG系统。这是一个面向企业内部的智能问答平台，我负责整体架构设计和检索优化。核心成果是将中文问答准确率从72%提升到89%，日均处理查询超过10万次。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '准确率提升的关键优化点是什么？能具体说说Embedding模型的优化过程吗？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '关键优化有三点。一是Embedding模型从通用的text-embedding-ada-002换成针对中文优化的BGE-large-zh，向量质量明显提升。二是分段策略从固定长度改成语义分段，用BERT做句子嵌入后按语义相似度聚类，避免了问答对跨段落的问题。三是加了重排序层，用Cross-Encoder对向量检索的Top20重新打分，筛选最相关的片段。Embedding模型的优化过程：我们先在内部标注数据集上评测了5个开源模型，BGE-large-zh在召回率和相关性上都最好。然后我们用领域数据做了continual pretraining，进一步提升了领域适配度。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: ' hallucination问题你们是怎么缓解的？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们从三个层面缓解。生成前：严格限制模型只能基于检索到的上下文回答，prompt里明确要求"如果上下文没有相关信息，请回答不知道"。生成中：用约束解码技术，限制模型输出中的实体必须在上下文中有对应。生成后：用NLI模型验证答案的忠实度，低于阈值的答案返回"无法确定"。另外我们在UI层加了引用溯源，每个回答都标注来源文档和页码，用户可以自行验证。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '我介绍一下多Agent协作框架。这个项目的核心挑战是如何让多个AI Agent高效协作完成复杂任务，而不是简单的串行执行。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_followup' as const, text: 'Agent之间的冲突怎么解决？比如两个Agent对同一个问题给出了矛盾的答案。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'candidate' as const, text: '我们实现了仲裁机制。当检测到冲突时，启动一个Arbiter Agent，它的角色是中立裁判。Arbiter会收集冲突双方的理由和证据，然后基于置信度和证据充分性做出裁决。如果置信度都不够高，Arbiter会要求重新检索或重新推理。我们还设定了冲突阈值，只有差异度超过阈值才触发仲裁，避免过度干预。实际运行中冲突率约5%，仲裁后满意度从78%提升到92%。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: 'RAG系统和Agent系统都涉及大模型调用，你们是怎么做成本控制的？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: 'RAG侧的成本控制主要靠缓存和模型降级。热点查询结果缓存到Redis，命中率约40%。非核心查询用小模型如GPT-3.5，核心查询才用GPT-4。Agent侧的成本控制更复杂，因为多Agent意味着多轮LLM调用。我们的策略是：简单任务用单Agent完成，复杂任务才启动多Agent协作；Agent内部用函数调用减少不必要的LLM交互；设置Token预算，单个任务超过预算自动降级或终止。整体成本下降了35%，用户体验没有明显损失。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'project_cross', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'project_qa' as const, phaseIndex: 0,
      scores: s5Scores,
      totalScore: total(s5Scores),
      evaluation: '项目描述有深度，技术细节掌握扎实。追问展现了良好的架构思考。跨项目对比时有洞察力。',
      interviewerReflection: '候选人对项目有深刻理解，不仅是执行者，更有架构设计能力。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '增加量化的业务价值数据' },
      ],
    },
  ],
  fullReview: null,
}

// ====== Session 6: 随机问答专项 (3.5) ======
const S6 = 'a0000006-0000-4000-b000-000000000006'
const s6Scores = scores(3.8, 3.2, 3.5, 3.5, 3.8)
const s6 = {
  id: S6,
  type: 'random_qa' as const,
  position: 'ai',
  targetCompany: '百川智能',
  jobDescription: 'AI工程师，负责大模型推理优化',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-09T14:00:00'),
  endedAt: T('2026-05-09T14:15:00'),
  createdAt: T('2026-05-09T13:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的，准备好了。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '请详细分析KV Cache在Transformer推理中的作用，以及PagedAttention是如何优化KV Cache管理的。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: 'KV Cache是为了避免自回归生成中重复计算历史token的Key和Value。在Transformer解码时，每个新token只需要计算自己的Q，然后用之前缓存的K和V做注意力计算。没有KV Cache的话每次生成都要重新计算所有历史token的KV，复杂度O(n^2*d)。PagedAttention的灵感来自操作系统的虚拟内存分页。它将KV Cache分成固定大小的block，像虚拟内存的page一样管理。每个sequence的KV Cache不需要连续存储，可以用非连续的block组成逻辑上的连续空间。这样解决了三个问题：一是内存碎片，因为block大小固定；二是动态扩展，sequence变长时只需要分配新block；三是内存共享，对于多采样和beam search，可以共享公共前缀的KV Cache block。vLLM基于PagedAttention实现了高吞吐的LLM服务。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '实现一个Trie树，支持插入、搜索和前缀匹配，要求尽量节省内存。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '用字典实现每个节点的子节点映射，每个节点包含children字典和isEnd标记。插入时逐字符遍历，不存在就创建新节点。搜索同理，最后检查isEnd。前缀匹配只需要遍历到前缀末尾返回true。内存优化可以用压缩Trie：如果某个节点只有一个子节点且不是单词结尾，就合并到父节点。另外可以用数组替代字典存储子节点，如果字符集有限的话。Python里可以用dict加__slots__减少内存开销。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个LLM推理服务的请求调度系统，要求支持不同优先级任务、流式输出、批量推理和超时控制。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '我会从五层设计。接入层：API Gateway做限流、鉴权和请求路由，支持HTTP和SSE两种协议。调度层：多级优先级队列，实时任务最高优，批处理任务低优。队列深度监控，超阈值时触发降级。推理层：Continuous Batching动态组batch，最大化GPU利用率。支持in-flight batching，新请求可以插入正在执行的batch。流式输出用SSE逐token推送给客户端。超时控制分请求级和token级，超过限制优雅终止并返回已生成内容。缓存层：用RadixCache缓存前缀匹配的KV Cache，相同system prompt的请求可以共享缓存。监控层：采集TTFT、TPOT、吞吐量、GPU利用率，自动扩缩容。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'random_qa' as const, phaseIndex: 0,
      scores: s6Scores,
      totalScore: total(s6Scores),
      evaluation: '基础概念理解深入，KV Cache和PagedAttention分析透彻。算法题给出多种优化思路。场景设计题方案完整，展现了LLM服务架构的系统思考。',
      interviewerReflection: '候选人基础知识扎实，技术视野开阔，对LLM推理优化有深入理解。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '算法题可以写出更完整的代码实现' },
      ],
    },
  ],
  fullReview: null,
}

export const aiAgentAccount: DemoAccount = {
  user,
  resume,
  projects,
  sessions: [s1, s2, s3, s4, s5, s6],
}
