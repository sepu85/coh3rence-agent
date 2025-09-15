# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running
- `pnpm dev` - Run the agent in development mode with hot reload (uses tsx)
- `pnpm build` - Compile TypeScript to JavaScript (outputs to dist/)
- `pnpm start` - Run the compiled agent from dist/main.js

### Docker Development
- `docker-compose up bot-dev` - Run development container with volume mounts for live editing
- `docker-compose up bot` - Run production container

## Architecture Overview

This is a consensus facilitation AI agent built on the Eliza OS framework (@elizaos/core). The agent specializes in formal consensus processes and organizational transformation.

### Core Components

**Main Entry Point (`src/main.ts`)**
- Initializes AgentRuntime with OpenAI GPT-4o model
- Sets up SQLite database with custom schema for consensus data
- Configures Telegram client interface
- Loads character definition from `characters/coh3rence.character.json`

**Consensus Actions (`src/actions/facilitation.ts`)**
Five core facilitation commands that store structured data in SQLite:
- `/propose` - Capture proposals
- `/concern` - Record concerns about proposals
- `/amend` - Suggest amendments
- `/testconsensus` - Initiate consensus check
- `/status` - Generate summary of current state

**Natural Language Evaluator (`src/evaluators/natural-language.ts`)**
Automatically detects consensus signals in natural conversation:
- `/agree` or "i agree", "+1" patterns → agree signal
- `/stand-aside` → stand-aside signal
- `/block` or "strong objection" → block signal

### Database Schema

SQLite database stores consensus process data:
- `memories` table: All consensus items (proposals, concerns, amendments, signals)
- `rooms` table: Chat room/group information
- Memory types: "proposal", "concern", "amendment", "consensus-check", "status", "consensus-signal"

### Character Configuration

The agent's personality and knowledge are defined in `characters/coh3rence.character.json`:
- Specializes in regenerative design, conflict transformation, inner development
- Grounded in Coh3rence Methodology (Ground → Relate → Cohere → Regenerate)
- Uses reflective, facilitative language style
- Knowledge base includes ReGov framework, formal consensus processes

### Environment Setup

Required environment variables in `.env`:
- `OPENAI_API_KEY` - OpenAI API access
- `TELEGRAM_BOT_TOKEN` - Telegram bot credentials
- `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`

### Data Persistence

- SQLite database at `./data/db.sqlite` (created automatically)
- Database schema initialized in `ensureSchema()` function
- All consensus interactions stored as memories with timestamps

## Requirements & Implementation Status

### ✅ **FULLY IMPLEMENTED** (~95% of core requirements)
**All Core Features Complete:**
- ✅ Proposal ID system with unique tagging (`#p1`, `#p2`, etc.)
- ✅ Enhanced commands: `/propose`, `/concern #pN`, `/amend #pN`, `/test #pN`, `/status`, `/status #pN`
- ✅ Formal Consensus stage management (CLARIFYING → TESTING → CONSENSED → BLOCKED)
- ✅ Help system (`/help`, `/help #pN`, `/whatnow #pN`) with Butler & Rothstein grounded explanations
- ✅ Enhanced natural language detection for consensus signals with proposal context
- ✅ Multiple parallel proposals per chat with proper state tracking
- ✅ Facilitative language and stage progression prompts
- ✅ SQLite database with proposal tables and interaction tracking
- ✅ Character-driven responses with Coh3rence methodology grounding

**Enhanced Database Schema:**
- `proposals` table: ID, number, stage, title, content, timestamps
- `proposal_interactions` table: concerns, amendments, consensus signals
- Automatic proposal numbering per room
- Stage transitions and help throttling

**New Files Added:**
- `src/util/proposals.ts` - ProposalManager class for all proposal operations
- Enhanced `src/actions/facilitation.ts` - ID-based commands with stage management
- Enhanced `src/actions/help.ts` - Context-aware help system
- Enhanced `src/evaluators/natural-language.ts` - Proposal-aware signal detection

### 🔄 **Ready for Future Extensions**
Based on `FNFreqs.zip` specifications:
- Architecture supports multiple roles (scribe, vibes-watcher)
- Extensible for semantic search and PostgreSQL migration
- Framework ready for multi-platform clients (Discord, web interface)

## Key Development Patterns

- Actions follow Eliza Action interface with name, description, similes, examples, validate, handler
- All database operations use AgentRuntime's databaseAdapter
- Memory creation uses custom UUID generation from `src/util/ids.ts`
- Command parsing extracts text after command prefix (e.g., "/propose text here")
- Error handling returns helpful usage instructions for malformed commands