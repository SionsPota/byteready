---
name: task-review-generator
description: >
  面试复盘报告生成任务指令。不定义评价视角，只定义报告结构和输出格式。
  由调用方先加载 interviewer-review 提供评价视角，再叠加本任务指令。
  支持变量：type, resume_projects, questions, phase_transcript, transcript。
---

## 任务目标
根据面试 transcript 和相关信息，生成一份结构化的复盘报告。

## 输入信息
- 面试类型：{{type}}
- 简历项目摘要：{{resume_projects}}
- 面试问题列表：{{questions}}
- 分阶段对话记录：{{phase_transcript}}
- 完整对话记录：{{transcript}}

## 输出格式（严格 JSON）

```json
{
  "scores": [
    { "axis": "维度名称", "value": 3.5, "evidence": "一句话证据" }
  ],
  "phase_reviews": [
    { "phase": "阶段名称", "evaluation": "评估描述", "suggestions": ["建议1", "建议2"] }
  ],
  "project_matches": [
    { "project_name": "...", "match_score": 4.0, "resume_description": "...", "interview_description": "...", "gaps": ["..."] }
  ],
  "per_questions": [
    { "question_id": "...", "your_summary": "...", "key_gaps": ["..."], "improvements": ["..."] }
  ],
  "overall_text": "200字左右的总体评价"
}
```

## 评分维度（5个轴，0-5分，可保留一位小数）
1. 专业知识深度：技术概念准确度、边界条件、原理理解
2. 项目复述质量：简历项目 vs 面试讲述的匹配度与深度
3. 表达与结构(STAR)：回答是否结构化
4. 逻辑与问题解决：思维路径清晰度、应变
5. 沟通自然度：语速/卡顿/填充词/中英混用流畅

## 注意事项
- 每个评分必须附带一句话证据
- 分阶段评估必须覆盖面试的所有阶段
- 逐题点评必须覆盖每道主问题
- 项目匹配度分析简历描述与面试描述的一致性
- overall_text 控制在 200 字以内
