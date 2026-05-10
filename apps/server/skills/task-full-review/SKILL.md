---
name: task-full-review
description: >
  整面复盘任务指令。不定义评价视角，只定义评分标准、复盘结构和输出格式。
  由调用方先加载 interviewer-review 提供评估者视角，再根据训练类型叠加 interview-coach 或 introduction-coach 提供教练视角，最后叠加本任务指令。
  支持变量：position, target_company, job_description, phase_summaries, session_info。
---

## 任务目标
根据所有阶段的复盘结果和整体对话记录，生成整面级别的综合复盘评估。

## 评估背景
- 岗位：{{position}}
- 目标公司：{{target_company}}
- 岗位描述（JD）：{{job_description}}
- 会话信息：{{session_info}}

## 各阶段复盘摘要
{{phase_summaries}}

## 评分维度（5个维度，每项 0-5 分，可保留一位小数，带权重）

### 1. 跨阶段一致性（权重 0.25）
评估候选人在不同阶段的表现是否一致、可信：
- 自我介绍中提到的技能是否在项目问答中得到验证
- 项目问答中声称的能力是否在技术问答中体现出来
- 各阶段之间的叙事是否自洽（无自相矛盾）
- 5分：自我介绍、项目、技术问答形成完整一致的能力画像
- 3分：基本一致，但某处有轻微不一致或未被验证的声明
- 1分：明显矛盾（如自称精通某技术但技术问答答不上来）

### 2. JD 匹配度（权重 0.25）
评估候选人整体能力与岗位要求的匹配程度：
- 核心技能要求是否都被覆盖
- 经验年限/项目规模是否与岗位层级匹配
- 软技能（沟通、协作）是否符合团队文化预期
- 5分：完美匹配，甚至有超出预期的亮点
- 3分：基本满足要求，但某方面有差距
- 1分：明显不匹配，核心能力缺失

### 3. 时间分配（权重 0.15）
评估各阶段的时间分配是否合理：
- 自我介绍是否控制在合理时长（不占用过多时间）
- 项目问答是否获得了充分的展开空间
- 技术问答是否有足够的时间展示深度
- 5分：时间分配完美，各阶段都得到恰当展示
- 3分：某阶段略长或略短，但整体可接受
- 1分：某阶段严重超时或严重压缩

### 4. 整体亮点（权重 0.15）
评估候选人最突出的优点：
- 是否有让面试官印象深刻的回答或特质
- 是否有罕见的技术深度或独特经历
- 是否有超出岗位要求的附加价值
- 5分：有 2-3 个令人难忘的亮点，属于"必须招"级别
- 3分：有 1 个亮点，整体表现良好
- 1分：无明显亮点，表现平平

### 5. 改进优先级（权重 0.20）
评估最关键的提升空间：
- 识别影响最大的短板（面试中的"一票否决"项）
- 评估改进的可行性和时间成本
- 区分"致命缺陷"和"锦上添花"
- 5分：无明显短板，已进入"打磨细节"阶段
- 3分：有 1-2 个需要重点改进的方面
- 1分：多个关键短板，需要系统性提升

## 面试官视角反思
基于 interviewer-review 的评估理念，给出整体面试的直觉判断：
- 如果必须给出一个 hire/no-hire 决策，你的判断是什么
- 候选人在概率分布上处于什么位置（前 10% / 前 30% / 前 50% / 后 50%）
- 如果有后续轮次，你最想验证候选人的哪个方面

## 输出格式（严格 JSON）

```json
{
  "scores": [
    { "dimension": "跨阶段一致性", "score": 3.5, "weight": 0.25, "weighted": 0.875, "evidence": "一句话证据" },
    { "dimension": "JD 匹配度", "score": 4.0, "weight": 0.25, "weighted": 1.000, "evidence": "一句话证据" },
    { "dimension": "时间分配", "score": 3.0, "weight": 0.15, "weighted": 0.450, "evidence": "一句话证据" },
    { "dimension": "整体亮点", "score": 3.5, "weight": 0.15, "weighted": 0.525, "evidence": "一句话证据" },
    { "dimension": "改进优先级", "score": 4.0, "weight": 0.20, "weighted": 0.800, "evidence": "一句话证据" }
  ],
  "overall_score": 3.65,
  "coherence_score": 3.5,
  "jd_match_score": 4.0,
  "overall_persona": "50字以内的候选人画像（如：技术扎实但表达偏保守的资深后端工程师）",
  "overall_evaluation": "300字以内的整面综合评价，包含优势、不足、总体印象",
  "consolidated_improvements": [
    { "priority": "high", "source_phases": ["project_qa"], "suggestion": "具体改进建议" },
    { "priority": "medium", "source_phases": ["self_intro", "random_qa"], "suggestion": "具体改进建议" }
  ]
}
```

## 计算规则
- overall_score = sum(weighted) = sum(score * weight)
- coherence_score = 跨阶段一致性 的原始分数（便于前端展示）
- jd_match_score = JD匹配度 的原始分数（便于前端展示）
- overall_persona 控制在 50 字以内，用一句话概括候选人的核心特质
- overall_evaluation 控制在 300 字以内
- consolidated_improvements 数量 3-5 条，去重合并跨阶段的相似建议
- source_phases 标注该建议来源于哪些阶段
