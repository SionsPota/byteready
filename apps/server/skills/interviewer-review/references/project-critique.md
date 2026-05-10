# Project Presentation Critique Methodology

How to evaluate a candidate's project presentation from an interviewer's
perspective. This applies when a candidate walks through a project on their
resume or presents a case study.

## The Presenter's Goals (What They're Trying to Achieve)
A strong project presentation in an interview context should:
1. **Demonstrate expertise** in a domain relevant to the role
2. **Show ownership** — clarify "I did X" vs. "the team did Y"
3. **Reveal problem-solving depth** — not just what was built, but why
4. **Signal transferable skills** — the lessons apply beyond this specific project
5. **Create conversation hooks** — leave openings for interesting follow-ups

## Evaluation Framework: The 5-Minute Rule

If the interviewer isn't engaged by minute 5, the project presentation has
failed — regardless of how impressive the actual work was. Evaluate along
these dimensions:

### 1. The Hook (First 30 Seconds)

**Strong hook pattern:**
> "I'll walk you through [Project X], where I reduced API latency by 40%
> for a system handling 50K RPM. The interesting challenge was that the
> obvious fix didn't work — we had to dig three layers deep."

**Weak hook pattern:**
> "So, this project was about building a microservices architecture. We
> used Spring Boot and Kubernetes and MySQL and Redis and..."

Evaluation questions:
- Did they start with the problem or the tech stack?
- Is there a clear "interesting challenge" teased upfront?
- Can a non-expert understand why this matters?

### 2. Context Setting (30 seconds - 2 minutes)

Evaluate whether they establish:
- **What the system/product does** (in 1 sentence)
- **Their specific role** ("I was the tech lead responsible for X")
- **Team size and their position** ("Team of 8, I owned the backend")
- **Success criteria** ("Our goal was to reduce X by Y%")

**Common failure**: spending 3 minutes on company background the interviewer
doesn't care about.

### 3. The Challenge (2-4 minutes)

The core of the presentation. Evaluate:

**Problem Definition Quality**
- Did they define the problem crisply?
- Did they quantify the impact (latency, cost, error rate, user complaints)?
- Did they explain *why* it was hard (not just *that* it was hard)?

**Solution Space Exploration**
- Did they consider multiple approaches?
- Can they articulate why they rejected alternatives?
- Is there evidence of genuine analysis, not just "we chose X"?

**Depth of Technical Detail**
- At the right level for the role?
- Specific enough to be credible, not so detailed it's boring?
- Do they understand the "why" behind their technical choices?

### 4. The Outcome (1-2 minutes)

Evaluate the closing:
- **Quantified results**: specific numbers with before/after
- **Business impact**: connected to user experience or revenue
- **Personal contribution**: clear "I" statements
- **Lessons learned**: genuine reflection, not generic platitudes

**Strong closing:**
> "The result: P95 latency dropped from 800ms to 120ms. But the bigger
> win was the debugging framework I built — the team has used it for
> 5 similar issues since, each resolving in hours instead of days. If
> I could do it again, I'd instrument earlier — we spent 2 weeks blind
> before adding the right metrics."

### 5. The Hooks (Throughout)

Did they leave openings for follow-up? Good hooks:
- "This is where I made my biggest mistake..." (the interviewer will ask)
- "The solution seems obvious in retrospect, but we went down three
  dead ends first..." (interviewer will ask which ones)
- "We had to violate one of the standard best practices, which made
> some people uncomfortable..." (interviewer will ask why)

## Common Project Presentation Anti-Patterns

| Anti-Pattern | Description | Fix |
|-------------|-------------|-----|
| **The laundry list** | Lists every technology used without explaining why | Lead with problem, mention tech only to explain the solution |
| **The team credit blur** | "We did..." for everything; unclear individual contribution | Explicitly state "My role was..." and "I personally..." |
| **The success theater** | Only mentions successes, hides failures | Include 1 genuine challenge or mistake with what you learned |
| **The jargon dump** | Uses acronyms and terms without checking interviewer familiarity | Define terms on first use, check in: "Are you familiar with X?" |
| **The deep dive trap** | Spends 80% of time on a technical detail that's not the core challenge | Structure as: overview → challenge → deep dive → outcome |
| **The no-numbers** | "Significantly improved performance" with no metrics | Prepare 2-3 specific numbers before the interview |
| **The ramble** | No clear structure, jumps between topics | Use the STAR framework: Situation → Task → Action → Result |

## The Feedback Format

When critiquing a project presentation, use this structure:

```
## Project Presentation Review: [Project Name]

### Overall Assessment
[Strong hire / Hire / Lean hire / etc.] for project depth

### The Hook
[Evaluation of opening 30 seconds]

### Context & Role Clarity
[Evaluation of how well they established their contribution]

### Technical Depth
[Evaluation of solution quality and technical reasoning]

### Outcome & Impact
[Evaluation of results presentation]

### Delivery & Structure
[Evaluation of communication quality]

### Top 2 Strengths
1. [Specific strength with example]
2. [Specific strength with example]

### Top 3 Improvements
1. [Specific issue] → [Suggested fix with example wording]
2. [Specific issue] → [Suggested fix with example wording]
3. [Specific issue] → [Suggested fix with example wording]

### 60-Second Rewrite
[If they had 60 seconds to present this project, here's the script]
```
