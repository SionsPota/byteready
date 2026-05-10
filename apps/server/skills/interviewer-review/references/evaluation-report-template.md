# Interview Evaluation Report Templates

Standard formats for documenting interview evaluations, plus guidance on
how to write effective interviewer feedback.

## Why Good Evaluation Reports Matter

1. **Decision input**: Hiring committees rely on your notes
2. **Consistency**: Structured notes enable fair comparison across candidates
3. **Calibration**: Over time, your evaluation quality reflects on you as an
   interviewer
4. **Legal protection**: Objective, evidence-based notes reduce bias claims

## The Standard Evaluation Report

### Template A: Structured Narrative (Recommended)

```markdown
## Interview Evaluation: [Candidate Name]

**Position**: [Role, Level]
**Interviewer**: [Name, Role]
**Date**: [Date]
**Round**: [1st Technical / 2nd System Design / 3rd Behavioral / HR]

### Verdict: [Strong Hire / Hire / Lean Hire / Lean No-Hire / No-Hire]

### Summary (2-3 sentences)
[The one-paragraph version that a busy hiring manager will actually read]

### Strengths
1. **[Skill area]**: [Specific evidence from interview]
   Example: "Algorithm: Solved the array problem with an optimal O(n)
   solution and identified the edge case of duplicate inputs without
   prompting."

2. **[Skill area]**: [Specific evidence from interview]

### Concerns
1. **[Skill area]**: [Specific evidence + risk assessment]
   Example: "Communication: Gave a 4-minute answer to 'Tell me about
   yourself' that included detailed job history from 2015. Risk:
   may struggle to communicate concisely in meetings."

2. **[Skill area]**: [Specific evidence + risk assessment]

### Detailed Notes

#### Technical/Coding
- Problem 1: [question summary]
  - Approach: [how they tackled it]
  - Code quality: [observations]
  - Follow-ups: [how they handled probes]
  - Score: [1-5]

- Problem 2: ...

#### System Design (if applicable)
- Requirements gathering: [did they ask clarifying questions?]
- Architecture: [high-level assessment]
- Deep dive areas: [where we went deep]
- Trade-off analysis: [quality of reasoning]
- Score: [1-5]

#### Behavioral
- Self-awareness: [evidence]
- Ownership: [evidence]
- Conflict handling: [evidence]
- Motivation: [evidence]
- Score: [1-5]

#### Communication
- Clarity: [evidence]
- Conciseness: [evidence]
- Responsiveness to feedback: [evidence]
- Score: [1-5]

### Red Flags (if any)
-[ ] None
-[ ] [Describe]

### Comparison to Bar
[How this candidate compares to current team members at this level]
```

### Template B: Quick Evaluation (Time-Pressed)

For when you have 5 minutes between interviews:

```markdown
## Quick Eval: [Candidate Name] — [Role, Level]

**Verdict**: [Verdict]
**Key Strength**: [One thing they did exceptionally well]
**Key Concern**: [One thing that worried you]
**Quote**: [One memorable quote — positive or negative]
**Compared to bar**: [Above / At / Below]
**Recommended follow-up**: [What the next interviewer should probe]
```

### Template C: Product/Generalist Evaluation

```markdown
## Evaluation: [Candidate Name] — [Product/Operations/etc.]

### Verdict: [Verdict]

### Product Sense (if PM)
- Problem identification: [score + evidence]
- Solution design: [score + evidence]
- Prioritization: [score + evidence]
- Metrics thinking: [score + evidence]

### Project Deep Dive
- Ownership clarity: [evidence]
- Technical/business depth: [evidence]
- Outcome measurement: [evidence]

### Stakeholder Skills
- Communication: [evidence]
- Conflict handling: [evidence]
- Influence without authority: [evidence]

### Overall Assessment
[2-3 paragraph narrative]
```

## Writing Effective Evaluation Notes

### DO
- Write notes immediately after the interview (memory decays fast)
- Use specific quotes: "Candidate said: 'I optimized the query'"
- Include your reasoning: "I rated this a 4 because..."
- Note what you didn't get to ask (for next round's benefit)
- Distinguish observation from inference: "Candidate hesitated for
  10 seconds before answering" (observation) vs. "Candidate didn't
  know the answer" (inference)

### DON'T
- Use generic phrases: "candidate was good", "solid technical skills"
- Copy-paste the same notes for every candidate
- Include demographic information (irrelevant to evaluation)
- Make promises or commitments in writing
- Use subjective or biased language

### Example: Good vs. Bad Notes

**Bad**:
> "Candidate was smart. Solved the problem well. Good communication.
> Recommend hire."

**Good**:
> "Algorithm (Q: merge k sorted lists): Candidate proposed min-heap
> approach unprompted, correctly identified O(n log k) complexity.
> Coded cleanly with good variable names. Follow-up: asked how to
> handle streaming input — gave thoughtful answer about chunked
> processing. One gap: didn't consider memory constraints of the
> heap until prompted. Communication: explained thought process
> proactively without me asking."

## The Verdict Scale

Use this scale consistently:

| Verdict | Definition | Typical Distribution |
|---------|-----------|-------------------|
| **Strong Hire** | Would fight to get this candidate. Exceptional in multiple dimensions. | ~10% of candidates |
| **Hire** | Meets or exceeds bar. Confident recommendation. | ~20% |
| **Lean Hire** | Meets minimum bar but has notable gaps. Would hire if needed. | ~25% |
| **Lean No-Hire** | Below bar in one or more key areas. Would not hire. | ~25% |
| **No-Hire** | Significant gaps. Would actively not recommend. | ~15% |
| **Strong No-Hire** | Red flags. Concerned about even interviewing further. | ~5% |

## Calibration Notes

- Your "hire" bar should match the team's current median performer
- If you're consistently rating higher than other interviewers, you're
  too lenient; if lower, too strict
- Discuss borderline cases in debrief meetings to calibrate
- Track your hire-vs-perform correlation over time (did your "hires"
  actually perform well?)
