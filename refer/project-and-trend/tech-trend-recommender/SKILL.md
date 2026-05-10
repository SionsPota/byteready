---
name: tech-trend-recommender
description: Analyze a resume to extract the candidate's tech stack and domain expertise, then search for and recommend the latest technology trends, news, and developments to expand their cognitive boundary. Use when the user wants to get technology trend recommendations based on their resume or profile, find relevant tech news for their field, or stay updated with cutting-edge developments in their technology stack.
---

# Tech Trend Recommender

Analyze resume content to identify the candidate's technology stack, then search for and summarize the latest relevant technology trends.

## Workflow

1. Parse resume content to extract: tech stack (languages, frameworks, tools), domain/industry, experience level
2. Map extracted skills to trend search domains (see references/trend-domains.md)
3. For each domain, run web searches for latest trends and news
4. Synthesize findings into structured trend report
5. Output recommendations with relevance scoring

## Resume Parsing

Extract these fields from resume text:

**Tech Stack**: Programming languages, frameworks, libraries, databases, cloud platforms, DevOps tools
**Domain**: Industry vertical (fintech, e-commerce, SaaS, AI/ML, etc.)
**Experience Level**: Junior (0-2y), Mid (3-5y), Senior (5y+)
**Role Type**: Frontend, Backend, Full-stack, Mobile, Data, DevOps, AI/ML, Product Manager

## Trend Search Strategy

For each identified domain, search with these query patterns:

```
"{domain}" technology trends 2026
"{tech_stack}" latest news updates
"{domain}" "{tech_stack}" new features releases
AI machine learning advancements "{domain}" 2026
open source projects "{tech_stack}" trending
```

## Output Format

Generate markdown report following this structure:

```markdown
# 技术趋势推荐报告

## 简历分析摘要
- **技术栈**: {extracted skills}
- **领域**: {domain}
- **经验层级**: {level}

## 核心技术趋势

### {Trend Category 1}
**相关度**: {score}/10
**摘要**: {2-3 sentence summary}
**关键要点**:
- Point 1
- Point 2
**学习建议**: {actionable advice}

### {Trend Category 2}
...

## 推荐阅读
1. [{title}]({url}) - {brief description}
2. ...

## 技能拓展路线图
{quarterly learning path}
```

## Scoring

Rate trend relevance 1-10 based on:
- Direct skill overlap (8-10): Trend directly involves candidate's tech stack
- Domain relevance (6-7): Same industry/domain, different tech
- Adjacent skill (4-5): Related technology area
- Future-proofing (3-4): Emerging tech that may impact their domain
