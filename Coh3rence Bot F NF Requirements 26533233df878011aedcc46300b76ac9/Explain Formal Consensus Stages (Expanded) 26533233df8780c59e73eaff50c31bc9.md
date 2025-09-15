# Explain Formal Consensus Stages (Expanded)

For a detailed description of Formal Consensus check: [https://theanarchistlibrary.org/library/c-t-butler-and-amy-rothstein-on-conflict-and-consensus-a-handbook-on-formal-consensus-decisionm](https://theanarchistlibrary.org/library/c-t-butler-and-amy-rothstein-on-conflict-and-consensus-a-handbook-on-formal-consensus-decisionm)

## FR19.a — Stage Model (What the bot “knows”)

The agent maintains a lightweight stage model per proposal `#pN`:

1. **Clarifying Questions**
2. **Concerns Collection** (surface concerns, name blocks)
3. **Amendment/Synthesis** (update proposal to address concerns)
4. **Consensus Test** (consent / concerns / block)
5. **Outcome** (Consensus / Blocked → return to 2 or 3)

Implementation hooks:

- Store `status` on each proposal memory: `"CLARIFYING" | "TESTING" | "CONSENSED" | "BLOCKED"`. (You already have this field.)
- Retrieve current stage via `messageManager.getMemories` filtered by `proposalId`.

---

## FR19.b — When to Explain (Triggers)

The bot proactively or reactively explains **the current stage** and **the next step** when any of these fire:

- **Trigger T1 (Command)**: `/help #pN`, `/why #pN`, `/whatnow #pN`.
- **Trigger T2 (Confusion)**: messages matching patterns like `what do we do now`, `how does consensus work`, `what is a block`, or repeated “?” near a stage transition (heuristic in evaluator).
- **Trigger T3 (Transition)**: After the bot moves a proposal into a new stage (e.g., after `/test #pN`) it posts a brief explainer. (Action handler emits an explainer.)
- **Trigger T4 (Timeout/Nudge, Optional)**: If no activity on `#pN` for N minutes during Clarifying/Amendment, provider posts a short “next step” hint.

---

## FR19.c — How to Explain (Content policy)

Explanations must be:

- **Anchored** to Formal Consensus (short, neutral, non-legalistic).
- **Contextual** to `#pN` (what stage we’re in, what’s expected from participants).
- **Actionable** (give one concrete call-to-action).
- **Throttled** (avoid spamming; one explainer per stage per 10 minutes unless asked).

---

## FR19.d — Message Templates (Drop-in)

Use these short templates in your action handlers and provider output.

### Clarifying (when proposal enters CLARIFYING)

> Stage: Clarifying — #pN
> 
> 
> Purpose: make sure everyone understands the proposal.
> 
> What you can do now: ask **clarifying questions** (not opinions).
> 
> Commands: `/status #pN`, `/concern #pN <text>`, `/amend #pN <text>`.
> 
> Next step: if clear, we’ll move to **concerns & amendments**, then test for consensus.
> 

### Concerns Collection (still CLARIFYING, nudging toward concerns)

> Stage: Concerns — #pN
> 
> 
> Purpose: surface **concerns** that could block adoption.
> 
> Share a concern: `/concern #pN <your concern>`
> 
> If your concern implies a change, propose an **amendment**: `/amend #pN <change>`.
> 
> Next step: we’ll integrate amendments, then **test consensus**.
> 

### Amendment/Synthesis

> Stage: Amendment — #pN
> 
> 
> Purpose: adjust the proposal to address concerns.
> 
> Propose changes: `/amend #pN <text>`
> 
> Proposer (or any volunteer) can **summarize the updated text**.
> 
> Next step: `/test #pN` to check for consensus.
> 

### Consensus Test

> Stage: Test — #pN
> 
> 
> Respond with:
> 
> • **Consent**: “consent #pN” or 👍
> 
> • **Concern**: `/concern #pN <text>`
> 
> • **Block** (only for fundamental conflicts): “block #pN <short reason>”
> 
> Next step: if no unresolved concerns/blocks, we declare **consensus**; otherwise, return to amendments.
> 

### Outcome

> Decision — #pN
> 
> 
> Result: **Consensus achieved** ✅ *(store final text)*
> 
> Or: **Blocked** ❌ *(list unresolved blocker and return to amendments)*
> 

---

## FR19.e — Role of Actions, Evaluators, Providers (wiring)

- **Actions**: Post stage explainers on transitions and on explicit commands (`/help`, `/test`, etc.).
- **Evaluators**: Detect natural-language help requests or confusion (regex/LLM trigger) → emit a virtual `/help #pN`.
- **Providers**: Inject “live status + short explainer” into state for every reply concerning `#pN` (so the model always sees “where we are” and “what’s next”).
- **Agent runtime**: Holds these components together and persists memories.

---

## FR19.f — Command Set (minimum)

- `/help #pN` — print stage explainer + next step. (Action)
- `/whatnow #pN` — alias of `/help`. (Action)
- Natural “what now?” → evaluator maps to `/help #pN`. (Evaluator)

---

## FR19.g — Data You Store (for explainers)

For each `#pN`: `status`, `lastExplainedAt`, counts of concerns/amendments, and latest proposal text. Use message memories for these; it’s fine in SQLite for prototype and upgradable to Postgres later.

---

## FR19.h — Throttling / Anti-spam

- Do not post an explainer for the same stage of the same `#pN` more than **once every 10 minutes**, unless explicitly asked (`/help`, `/why`).
- Provider returns empty string if `lastExplainedAt` is recent to avoid over-contexting.

---

## FR19.i — Edge Cases & Rules of Thumb

- **Multiple proposals active**: Always include the tag (`#pN`) and title line in explainers.
- **Blocks**: Ask for a short reason and immediately invite an amendment suggestion.
- **No activity**: After N minutes, a gentle nudge with the current stage and a single CTA. (Provider T4)
- **Over-discussion in clarifying**: Gently remind group that clarifying ≠ debating; invite concerns or move to test.
- **Consensus fatigue**: Offer a brief summary of remaining disagreements before testing again.

---

## FR19.j — Implementation Sketch (where code lives)

- **`actions/help.ts`**
    - `HELP_PROPOSAL` action; `validate()` for `/help` & `/whatnow`; `handler()` prints the stage template based on `status`.
- **`evaluators/clarity.ts`**
    - Detects confusion phrases → creates a message that triggers `HELP_PROPOSAL`.
- **`providers/stageContext.ts`**
    - Returns `Current: <stage> | Next: <hint>` concatenated to state context; rate-limits via `lastExplainedAt`.

---

## FR19.k — Copy Blocks (ready to paste)

### `/help` Action handler (pseudo)

```
If text matches "/help #pN" or "/whatnow #pN":
  load proposal by id
  switch(status):
    CLARIFYING -> post Clarifying template
    TESTING    -> post Test template
    CONSENSED  -> post Outcome template (consensus)
    BLOCKED    -> post Outcome (blocked) + invite amendment
  update lastExplainedAt = now

```

### Evaluator rule (regex MVP)

- `/what now|what’s next|how does (this|consensus) work|explain (stage|consensus)/i`
    
    → synthesize `/help #pN` for the most recent `#pN` mentioned (or latest active).
    

### Provider (context MVP)

- Fetch latest `#pN` the user referenced; return a single line:
    
    `Stage: CLARIFYING — Ask clarifying Qs. Next: share concerns or /amend #pN.`
    
- Suppress if `lastExplainedAt < 10m`.