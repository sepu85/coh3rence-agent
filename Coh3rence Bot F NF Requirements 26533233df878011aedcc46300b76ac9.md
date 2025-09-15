# Coh3rence Bot F/NF Requirements

Status: In progress

# 📑 Functional & Non-Functional Requirements — Coh3rence Consensus Agent

## 1. Purpose

The Coh3rence Agent acts as a **Telegram bot facilitator** for group decision-making using **Formal Consensus** (Butler & Rothstein), with grounding in Coh3rence’s methodology (Ground → Relate → Cohere → Regenerate) and regenerative governance principles.

---

## 2. Functional Requirements

### 2.1 Core Facilitation

- **Proposal Management**
    - FR1: Users can create proposals via `/propose` or “I propose …”.
    - FR2: Each proposal is uniquely tagged (`#p1`, `#p2`…).
    - FR3: Agent stores title, summary, author, and stage.
- **Concern & Amendment Handling**
    - FR4: Users can register concerns (`/concern #pN …`).
    - FR5: Users can suggest amendments (`/amend #pN …`).
    - FR6: Agent records them and associates them with the correct proposal.
- **Consensus Testing**
    - FR7: Facilitator (or proposer) can trigger `/test #pN`.
    - FR8: Agent prompts group to consent (👍 / “consent”), raise concerns, or block.
    - FR9: Blocks must include reasons; agent prompts for amendments.
- **Status Tracking**
    - FR10: `/status` lists all active proposals.
    - FR11: `/status #pN` shows details, concerns, amendments, and current stage.

---

### 2.2 Group Interaction

- FR12: Agent recognizes both **commands** and **natural-language inputs** (via evaluator regex → command conversion).
- FR13: Agent responds with **facilitative language** (clarify, summarize, invite input).
- FR14: Agent prompts group to move from **clarification → testing → consensus**.

---

### 2.3 Memory & Persistence

- FR15: Agent stores proposals, concerns, and amendments in a local database (SQLite in prototype).
- FR16: Past proposals and decisions are retrievable within the same chat session.
- FR17: System supports semantic search on past proposals (optional in prototype).

---

### 2.4 Knowledge Anchoring

- FR18: Agent responses are grounded in:
    - *On Conflict & Consensus* (Butler & Rothstein)
    - *The Little Book of Conflict Transformation* (Lederach)
    - *An Everyone Culture* (Kegan & Lahey)
    - *Designing Regenerative Cultures* (Wahl)
    - *ReGov Frameworks* and *Coh3rence Methodology*
- FR19: Agent explains stages of **Formal Consensus** when needed.
    - For a detailed AND Full description of Formal Consensus check: [https://theanarchistlibrary.org/library/c-t-butler-and-amy-rothstein-on-conflict-and-consensus-a-handbook-on-formal-consensus-decisionm](https://theanarchistlibrary.org/library/c-t-butler-and-amy-rothstein-on-conflict-and-consensus-a-handbook-on-formal-consensus-decisionm)
    
    [Explain Formal Consensus Stages (Expanded)](Coh3rence%20Bot%20F%20NF%20Requirements%2026533233df878011aedcc46300b76ac9/Explain%20Formal%20Consensus%20Stages%20(Expanded)%2026533233df8780c59e73eaff50c31bc9.md)
    

---

### 2.5 Platform Integration

- FR20: Agent runs as a **Telegram bot** in group chats.
- FR21: Supports multiple proposals in parallel within one chat.
- FR22: Logs interactions for later analysis.

---

## 3. Non-Functional Requirements

### 3.1 Usability

- NFR1: Bot must be simple to use for **non-technical participants** (commands + natural language).
- NFR2: Responses must be **clear, respectful, and facilitative**, avoiding technical jargon.

### 3.2 Reliability

- NFR3: Data persistence via SQLite (prototype).
- NFR4: Proposals/concerns should not be lost if the bot restarts.

### 3.3 Performance

- NFR5: Should handle **~50 participants** in a group chat with multiple parallel proposals.
- NFR6: Latency for responses < 3 seconds (typical for OpenAI API).

### 3.4 Security

- NFR7: Secrets (`OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`) must be stored in `.env`.
- NFR8: Do not log or expose API keys in chat.

### 3.5 Extensibility

- NFR9: Architecture should allow adding:
    - Role simulation (scribe, vibes-watcher)
    - Advanced evaluators (NLP instead of regex)
    - PostgreSQL persistence with vector search
    - Multi-platform support (Discord, Twitter, Direct API)

### 3.6 Maintainability

- NFR10: Code structured with **actions**, **evaluators**, and **providers**.
- NFR11: Clear backlog of future upgrades (consensus visualization, threads per proposal, etc.).

---

## 4. Future Features / Roadmap

### 4.1 Facilitation Roles

- FF1: Simulate multiple roles:
    - *Facilitator* (default)
    - *Scribe* (auto-generate meeting minutes)
    - *Vibes-watcher* (detect tone/tension in chat)

### 4.2 State Management

- FF2: Explicit state machine per proposal (stages, transitions, votes).
- FF3: Track who has consented, raised concerns, or blocked.

### 4.3 Enhanced Interaction

- FF4: Support **Telegram threads/topics** for each proposal.
- FF5: Visual dashboards summarizing proposals and status.
- FF6: Automatic reminders for unresolved proposals.

### 4.4 Knowledge & Context

- FF7: RAG pipeline: embed and retrieve passages from source books & frameworks.
- FF8: Live context provider: inject “current stage & next step” into every reply.

### 4.5 Database & Scaling

- FF9: Upgrade to **PostgreSQL + pgvector** for scalable semantic search.
- FF10: Support **Supabase** for real-time and hosted persistence.

### 4.6 Multi-Platform

- FF11: Extend clients to Discord, Twitter, or web interface.
- FF12: Direct API client for integration into DAOs or apps.

### 4.7 Governance Intelligence

- FF13: Suggest amendments when blocks arise (AI-assisted synthesis).
- FF14: Detect recurring patterns of concerns for organizational learning.
- FF15: Export minutes + decisions in Markdown / JSON for archiving.