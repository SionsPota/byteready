# Interview Playback Review Methodology

How to review a complete interview transcript or recording from the
interviewer's perspective.

## Input Requirements

For a thorough review, the user should provide:
- Full transcript (preferred) or detailed notes of the interview
- Position type and level (e.g., "Backend Engineer P6", "Product Manager L5")
- Company context (e.g., "ByteDance", "Alibaba", "startup")
- Which round it was (1st technical, 2nd system design, 3rd behavioral, HR)
- Their own assessment of how it went

If transcript is partial, note the limitation and focus on available content.

## Phase 1: Read-Through & Annotation (Internal)

First pass: mark the transcript with internal codes:

| Code | Meaning |
|------|---------|
| ++ | Strong positive signal |
| + | Positive signal |
| ~ | Neutral/unremarkable |
| - | Negative signal |
| -- | Red flag |
| ? | Needs more information |
| R | Rambling / unfocused |
| V | Vague / no specifics |
| T | Tangential / off-topic |

## Phase 2: Question-by-Question Analysis

For each substantive question, produce a 5-field analysis:

### Field 1: Question Classification
Categorize the question type:
- **Technical knowledge**: "Explain how X works"
- **Problem-solving**: "How would you approach X?"
- **Behavioral/STAR**: "Tell me about a time when..."
- **Motivation**: "Why this company/role?"
- **System design**: "Design a system for X"
- **Self-assessment**: "What's your biggest weakness?"

### Field 2: Response Structure Assessment
Evaluate structural quality:
- Did they answer the question that was asked (not the one they wished was asked)?
- Was the opening sentence a clear answer or a preamble?
- Was the answer proportionate to the question's depth?
- Did they signal when they were done, or did they trail off?

### Field 3: Content Quality Assessment
Evaluate substance:
- Were claims backed by evidence?
- Was the technical accuracy high?
- Did they demonstrate depth or just surface knowledge?
- Were there logical inconsistencies?

### Field 4: Communication Assessment
Evaluate delivery:
- Speaking pace (too fast = nervous, too slow = unprepared)
- Use of filler words ("um," "like," "you know")
- Interviewer engagement (did they check in: "Does that make sense?")
- Confidence vs. arrogance balance

### Field 5: Interviewer Internal Monologue
Write what the interviewer was likely thinking:

Good example:
> "OK, they started with the core concept correctly. Now they're getting
> into the details — good, they understand the trade-offs. Wait, they
> said 'eventual consistency' but then described strong consistency
> behavior. That's a mismatch. I'll dig here."

Bad example:
> "The candidate gave a good answer." (too generic)

## Phase 3: Cross-Question Pattern Analysis

Look for patterns across the full interview:

### Strength Patterns
- **Consistent depth**: strong across multiple technical areas
- **Growth narrative**: demonstrates clear career trajectory
- **Ownership pattern**: consistently uses "I" for contributions, "we" for team context
- **Resilience pattern**: handles follow-up challenges gracefully

### Problem Patterns
- **The evasion loop**: avoids direct answers to hard questions
- **The inflation pattern**: claims expertise that doesn't survive follow-up
- **The ramble pattern**: takes 3x time needed for every answer
- **The deflection pattern**: redirects tough questions to safe territory
- **The inconsistency pattern**: contradicts earlier answers

## Phase 4: Verdict & Action Plan

### Verdict Options
- **Strong Hire**: Would enthusiastically recommend. Exceeded bar.
- **Hire**: Meets bar. Solid performance with minor gaps.
- **Lean Hire**: Meets minimum bar but has notable concerns.
- **Lean No-Hire**: Below bar in one or more critical dimensions.
- **No-Hire**: Significant gaps or red flags. Would not recommend.
- **Strong No-Hire**: Major red flags. Would actively oppose.

### The Action Plan
Regardless of verdict, end with a concrete preparation plan:

```
## Action Plan for Next Interview

### Keep Doing (1 thing)
[The strongest pattern they should reinforce]

### Start Doing (2 things)
1. [Specific behavioral change with example]
2. [Specific behavioral change with example]

### Stop Doing (1 thing)
[The most damaging pattern to eliminate]

### Prepare Specifically
- [Topic/area to study or rehearse]
- [Specific question to prepare an improved answer for]
- [Mock interview focus area]
```

## Special Considerations by Round

### Technical Round Review
- Focus: correctness, coding fluency, edge case handling, complexity analysis
- Common issue: candidates explain the algorithm but code sloppily
- Look for: thought process visibility ("I'm choosing X because...")

### System Design Round Review
- Focus: requirements gathering, architecture quality, trade-off analysis
- Common issue: jumping to solutions without understanding requirements
- Look for: scalability intuition and failure mode awareness

### Behavioral Round Review
- Focus: self-awareness, ownership, conflict handling, motivation
- Common issue: generic answers without specific evidence
- Look for: authentic vulnerability balanced with confidence

### HR Round Review
- Focus: stability, cultural fit, compensation alignment
- Common issue: being too candid about negative reasons for leaving
- Look for: genuine interest in the specific company/role
