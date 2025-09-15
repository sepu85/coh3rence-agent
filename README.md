# Coh3rence Consensus Bot

An AI-powered Telegram bot that facilitates **Formal Consensus** decision-making processes based on Butler & Rothstein's methodology. Built with the Eliza OS framework and designed to support regenerative collaboration and collective sensemaking.

## Features

### Core Consensus Commands
- **`/propose <idea>`** - Create new proposal with unique ID (#p1, #p2, etc.)
- **`/concern #pN <text>`** - Record concerns about specific proposals
- **`/amend #pN <text>`** - Suggest amendments to proposals
- **`/test #pN`** - Move proposals to consensus testing stage
- **`/status`** - View all proposals or detailed status of specific proposal
- **`/help`** - Show command guide and stage explanations

### Natural Language Support
- **"consent #p1"** or 👍 - Give consent to proposals
- **"block #p1 <reason>"** - Block proposals with reasoning
- **"stand aside #p1"** - Stand aside with concerns

### Consensus Process Stages
1. **Clarifying** - Ask questions to understand the proposal
2. **Testing** - Respond with consent, concerns, or blocks
3. **Consensed** - Agreement reached ✅
4. **Blocked** - Unresolved concerns need amendments ❌

## Technology Stack

- **Framework**: [Eliza OS](https://github.com/elizaos/eliza) - Autonomous agent framework
- **Platform**: Telegram Bot API
- **Language**: TypeScript/Node.js
- **Database**: SQLite with better-sqlite3
- **AI Model**: OpenAI GPT-4o for responses

## Quick Start

### Prerequisites

- **Node.js v20+** (v23 has compatibility issues with better-sqlite3)
- **pnpm** package manager
- **OpenAI API Key**
- **Telegram Bot Token** from [@BotFather](https://t.me/botfather)

### 1. Clone & Install

```bash
git clone https://github.com/sepu85/coh3rence-agent.git
cd coh3rence-agent
nvm use 20  # Switch to Node v20
pnpm install
```

### 2. Environment Setup

Create a `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
USE_OPENAI_EMBEDDING_TYPE=true
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
USE_OLLAMA_EMBEDDING_TYPE=false
```

### 3. Run the Bot

**Development:**
```bash
pnpm dev
```

**Production:**
```bash
pnpm build
pnpm start
```

## Creating Your Telegram Bot

### Step 1: Create Bot with BotFather

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Choose a name and username for your bot
4. Copy the API token provided

### Step 2: Configure Bot Commands

Send this to [@BotFather](https://t.me/botfather):

```
/setcommands
```

Then paste these commands:

```
propose - Create new proposal with unique ID
concern - Record concern about specific proposal
amend - Suggest amendment to specific proposal
test - Move proposal to consensus testing stage
status - Show proposals status summary
help - Show help guide and available commands
whatnow - Show next steps for proposal stage
```

### Step 3: Configure Bot Settings

**Set Description:**
```
/setdescription

Coh3rence Consensus Bot facilitates Formal Consensus decision-making processes. Use /help to see available commands and learn about the consensus stages.
```

**Set About Text:**
```
/setabouttext

AI-powered consensus facilitation bot based on Butler & Rothstein's Formal Consensus methodology. Supports regenerative collaboration through structured decision-making processes.
```

## Customization

### Character Configuration

Edit `characters/coh3rence.character.json` to customize:

- **Personality** - Adjust `bio`, `lore`, and `style` sections
- **Knowledge Base** - Update `knowledge` array with your specific context
- **Topics** - Modify relevant discussion topics
- **Response Style** - Customize how the bot communicates

### Database Schema

The bot creates these tables automatically:
- `proposals` - Proposal tracking with stages
- `proposal_interactions` - Concerns, amendments, consensus signals
- `accounts`, `rooms`, `participants` - User and group management
- `memories` - Conversation context for AI responses

## Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t coh3rence-bot .

# Run container
docker run -d \
  --name coh3rence-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  coh3rence-bot
```

### VPS/Cloud Deployment

1. **Clone repository** on your server
2. **Install dependencies** with pnpm
3. **Configure environment** variables
4. **Build the application**: `pnpm build`
5. **Use process manager**: PM2, systemd, or Docker
6. **Set up reverse proxy** if needed (nginx/caddy)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | ✅ Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token | ✅ Yes |
| `USE_OPENAI_EMBEDDING_TYPE` | Use OpenAI embeddings | No (default: true) |
| `OPENAI_EMBEDDING_MODEL` | Embedding model name | No (default: text-embedding-3-small) |

## Contributing

This bot implements requirements from the Coh3rence methodology for regenerative collaboration. Contributions should align with:

- **Butler & Rothstein Formal Consensus** principles
- **Coh3rence methodology** (Ground → Relate → Cohere → Regenerate)
- **Regenerative design** and systems thinking
- **Inclusive facilitation** practices

## Troubleshooting

### Common Issues

**Node.js v23 Compatibility:**
```bash
nvm install 20
nvm use 20
rm -rf node_modules
pnpm install
```

**Database Errors:**
- Ensure `data/` directory exists and is writable
- Check SQLite permissions

**Bot Not Responding:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check OpenAI API key has sufficient credits
- Review bot logs for error messages

**Memory/Type Errors:**
- Restart the bot process
- Clear `data/db.sqlite` if needed (will reset all proposals)

## License

This project implements methodologies from:
- Butler & Rothstein's "On Conflict & Consensus"
- Coh3rence regenerative collaboration framework
- Eliza OS autonomous agent architecture

## Support

For issues related to:
- **Consensus methodology**: Review Butler & Rothstein documentation
- **Bot functionality**: Check GitHub issues
- **Eliza framework**: See [Eliza OS documentation](https://github.com/elizaos/eliza)
- **Deployment**: Standard Node.js/Docker troubleshooting

---

**Start facilitating regenerative consensus today!** 🤖✨

*Ground → Relate → Cohere → Regenerate*