---
name: interview-coach
description: "Evaluate and optimize interview answers for project experience questions in internet/tech company interviews. Use when the user provides an interview scenario, a question asked by an interviewer, and their answer about a project, to diagnose problems, score the answer, and provide optimized versions. Covers technical and general positions at internet companies (product, R&D, operations, data, etc.). Triggers on keywords like: interview project answer optimization, mock interview evaluation, STAR review, project experience polish, interview coaching, 面试项目回答优化, 模拟面试评价."
---

# Interview Project Answer Coach

Evaluate interview answers about project experience and provide structured optimization to help candidates improve their responses for internet/tech company interviews.

## Workflow

1. **Receive** the user's interview question + their answer (or a self-introduction/project description)
2. **Analyze** the answer using the 6-dimension evaluation framework (see references/evaluation-framework.md)
3. **Score** each dimension 1-5, with specific evidence
4. **Diagnose** the top 3 problems with severity tags
5. **Optimize** by providing an improved version using the OPTIMIZE structure
6. **Teach** 1 actionable technique the user can apply next time

## Evaluation Framework (6 Dimensions)

Load `references/evaluation-framework.md` for the complete rubric with scoring criteria, bad/good examples, and optimization patterns.

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| STAR-Completeness | 20% | Situation, Task, Action, Result all present and clear |
| Quantification | 20% | Use of numbers, metrics, percentages instead of vague adjectives |
| Technical Depth | 20% | Specific technologies, architectural decisions, problem-solving details |
| Personal Contribution | 15% | Clear ownership and individual impact (not "we did...") |
| Business Awareness | 15% | Connection to business value, user impact, cost/efficiency |
| Expression & Logic | 10% | Structured flow, conciseness, appropriate pace |

## Scoring Rubric Summary

- **5 (Excellent)**: Exceeds expectations, memorable, interviewers would cite as example
- **4 (Good)**: Solid, well-structured, minor gaps only
- **3 (Passable)**: Contains all basic elements but lacks depth or impact
- **2 (Weak)**: Missing key elements, vague, or disorganized
- **1 (Poor)**: Fails to communicate value, risks interviewer losing interest

## Output Format

Use this structure for every evaluation:

```markdown
## 综合评价
- 总分: X/5.0
- 一句话诊断: [核心问题的一句话描述]

## 维度评分
| 维度 | 得分 | 关键问题 |
|------|------|----------|
| ... | ... | ... |

## 核心问题诊断（TOP 3）
1. **[问题类型]** [描述] — 严重程度: 🔴/🟡/🟢
...

## 优化版本
[Optimized answer using OPTIMIZE structure]

## 本次可带走的一个技巧
[One specific, actionable technique]
```

## Optimization Structure (OPTIMIZE)

When rewriting answers, follow this internal structure:

- **O**pen with context: 1 sentence on Situation
- **P**roblem focus: What specific technical/business challenge
- **T**echnical decision: What you chose and why (show trade-off thinking)
- **I**mplementation: Your specific actions (not team's)
- **M**etrics: Quantified results with before/after comparison
- **I**mpact scope: Business value + technical legacy
- **Z**ero filler: Remove vague adjectives, replace with specifics
- **E**levate: End with learning/reflection showing growth mindset

## Key Principles

- Be direct and specific. Avoid generic praise like "good job" or "not bad"
- Always provide before/after contrast so user sees the gap
- If answer lacks metrics, invent realistic placeholders and flag them
- If user mentions unfamiliar tech, ask before assuming
- Tailor advice to position type: technical roles need depth; product roles need user/business thinking; general roles need breadth
- Flag any suspected真实性 issues diplomatically

## Position-Type Adaptations

| Position Type | Emphasize | De-emphasize |
|---------------|-----------|--------------|
| Technical (dev/algo) | Technical depth, architecture decisions, performance metrics | Business fluff |
| Product/PM | User insight, data-driven decisions, cross-team coordination | Code-level details |
| Data/Analytics | Analysis methodology, metric design, insight quality | UI/backend specifics |
| Operations/Growth | Strategy design, resource efficiency, measurable outcomes | Deep technical implementation |
| General/Management | Leadership, stakeholder management, scope & complexity | Individual contributor tasks |
