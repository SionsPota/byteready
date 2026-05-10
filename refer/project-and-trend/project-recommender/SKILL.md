---
name: project-recommender
description: Analyze a resume to identify skill gaps and missing portfolio pieces, then recommend concrete, reproducible projects that the candidate can build to enrich their resume and experience. Use when the user wants project ideas to strengthen their profile, fill skill gaps, add portfolio pieces, or gain hands-on experience with new technologies relevant to their career goals.
---

# Project Recommender

Analyze resume content to identify skill gaps and missing portfolio depth, then recommend reproducible projects with clear tech stacks and implementation paths.

## Workflow

1. Parse resume to extract: existing skills, listed projects, experience gaps, target role
2. Identify skill gaps by comparing against target role requirements (see references/role-requirements.md)
3. Evaluate existing project portfolio for depth and breadth
4. Recommend projects categorized by duration and impact
5. Output structured project recommendations with implementation guides

## Gap Analysis

Compare candidate profile against role archetypes:

**Frontend Engineer**: React/Vue advanced patterns, performance optimization, design systems, micro-frontends
**Backend Engineer**: Distributed systems, high-concurrency, API design, database optimization, caching strategies
**Full-stack Engineer**: End-to-end architecture, SSR/SSG, deployment pipelines, full-stack TypeScript
**AI/ML Engineer**: Model deployment, MLOps, RAG systems, fine-tuning, vector databases
**Data Engineer**: Streaming pipelines, data warehousing, ETL/ELT, real-time analytics
**DevOps/SRE**: IaC, Kubernetes, observability, CI/CD, chaos engineering
**Product/综合岗**: Data-driven product decisions, A/B testing frameworks, growth engineering, analytics dashboards

## Project Categorization

**Quick Wins** (4-8 hours): Focused demonstrations of specific skills
**Weekend Builds** (1-2 weekends): Small full-stack or deep-dive projects
**Deep Dives** (2-4 weeks): Comprehensive portfolio centerpiece projects

## Output Format

Generate markdown report following this structure:

```markdown
# 项目推荐报告

## 技能缺口分析
- **现有技能**: {current skills}
- **目标岗位**: {target role}
- **关键缺口**: {identified gaps}

## 推荐项目

### {Project Name}
**类型**: {Quick Win | Weekend Build | Deep Dive}
**难度**: {Beginner | Intermediate | Advanced}
**预计耗时**: {time estimate}
**技术栈**: {tech stack}
**弥补缺口**: {which gap this addresses}

**项目描述**:
{2-3 sentences describing what to build}

**核心功能**:
- Feature 1
- Feature 2
- Feature 3

**技术亮点**:
- Highlight 1 (shows specific skill)
- Highlight 2 (differentiator)

**实现步骤**:
1. Step 1
2. Step 2
3. Step 3

**简历描述模板**:
> {ready-to-use bullet point for resume}

### {Next Project}
...

## 学习路径建议
{recommended sequence with dependencies}
```

## Scoring

Prioritize projects by impact score (1-10):
- Gap coverage (weight 0.4): How well it fills identified skill gaps
- Resume value (weight 0.3): Impressiveness to recruiters/hiring managers
- Feasibility (weight 0.2): Achievable within stated time budget
- Trend alignment (weight 0.1): Uses current/relevant technologies
