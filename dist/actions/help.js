import { newId } from "../util/ids";
import { ProposalManager } from "../util/proposals";
function getProposalManager() {
    const db = global.rawDatabase;
    if (!db)
        throw new Error("Database not initialized");
    return new ProposalManager(db);
}
function extractAfterCommand(text, cmd) {
    const trimmed = (text || "").trim();
    if (!trimmed.toLowerCase().startsWith(cmd))
        return "";
    return trimmed.slice(cmd.length).trim();
}
// Stage explanation templates
const STAGE_EXPLANATIONS = {
    CLARIFYING: (pNum) => `
🔍 **Stage: Clarifying** — #p${pNum}

Purpose: Make sure everyone understands the proposal.

What you can do now: Ask **clarifying questions** (not opinions).

Commands: \`/concern #p${pNum} <text>\`, \`/amend #p${pNum} <text>\`

Next step: If clear, we'll move to **concerns & amendments**, then test for consensus.`,
    TESTING: (pNum) => `
🧭 **Stage: Consensus Test** — #p${pNum}

Respond with:
• **Consent**: "consent #p${pNum}" or 👍
• **Concern**: \`/concern #p${pNum} <text>\`
• **Block** (only for fundamental conflicts): "block #p${pNum} <reason>"

Next step: If no unresolved concerns/blocks, we declare **consensus**; otherwise, return to amendments.`,
    CONSENSED: (pNum) => `
✅ **Decision** — #p${pNum}

Result: **Consensus achieved** ✅`,
    BLOCKED: (pNum) => `
❌ **Decision** — #p${pNum}

Result: **Blocked** ❌ (unresolved concerns need amendments)`
};
const GENERAL_HELP_TEXT = `
🤖 **Coh3rence Consensus Bot — Help Guide**

**Core Commands:**
• \`/propose <your proposal>\` — Create a new proposal with unique ID
• \`/concern #pN <text>\` — Record concern about proposal N
• \`/amend #pN <text>\` — Suggest amendment to proposal N
• \`/test #pN\` — Move proposal N to consensus testing
• \`/status\` — Show all proposals
• \`/status #pN\` — Show detailed status of proposal N
• \`/help #pN\` — Show stage explanation for proposal N

**Natural Language:**
• "consent #pN" or 👍 — Give consent
• "stand aside #pN" — Stand aside with reason
• "block #pN <reason>" — Block with reason

**Formal Consensus Stages:**
1. **Clarifying** — Ask questions to understand
2. **Testing** — Respond with consent/concerns/blocks
3. **Consensed** — Agreement reached
4. **Blocked** — Unresolved concerns, needs amendments

Based on Butler & Rothstein's *On Conflict & Consensus*
`.trim();
const helpProposalAction = {
    name: "help",
    description: "Show help for consensus process or explain proposal stage.",
    similes: ["help", "guide", "commands", "how to", "whatnow", "explain"],
    examples: [
        [
            { user: "user", content: { text: "/help" } },
            { user: "assistant", content: { text: GENERAL_HELP_TEXT } },
        ],
        [
            { user: "user", content: { text: "/help #p1" } },
            { user: "assistant", content: { text: "Stage explanation for #p1..." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        try {
            const text = message?.content?.text ?? "";
            const roomId = message?.room?.id ?? message?.roomId;
            const userId = message?.user?.id ?? message?.userId;
            const proposalManager = getProposalManager();
            const afterCmd = extractAfterCommand(text, "/help") || extractAfterCommand(text, "/whatnow");
            const proposalNumbers = afterCmd ? proposalManager.extractProposalNumbers(afterCmd) : [];
            // If specific proposal requested
            if (proposalNumbers.length > 0) {
                const proposalNumber = proposalNumbers[0];
                const proposal = await proposalManager.getProposal(roomId, proposalNumber);
                if (!proposal) {
                    return {
                        content: {
                            text: `❌ Proposal #p${proposalNumber} not found.`,
                        },
                    };
                }
                // Update last explained timestamp
                await proposalManager.updateLastExplained(proposal.id);
                let helpText = `🔍 **Help for #p${proposalNumber}**\n\n**${proposal.title}**\n`;
                if (proposal.stage in STAGE_EXPLANATIONS) {
                    helpText += STAGE_EXPLANATIONS[proposal.stage](proposalNumber);
                }
                return { content: { text: helpText } };
            }
            // Show general help
            await runtime.databaseAdapter.createMemory({
                id: newId(),
                roomId: roomId,
                userId: userId,
                agentId: runtime.agentId,
                type: "help",
                content: { text: "General help viewed" },
                createdAt: Date.now(),
            });
            return { content: { text: GENERAL_HELP_TEXT } };
        }
        catch (error) {
            console.error("Error in helpProposalAction:", error);
            return {
                content: {
                    text: "❌ Error retrieving help. Please try again.",
                },
            };
        }
    },
};
// Alias for /whatnow command
const whatnowAction = {
    name: "whatnow",
    description: "Show what to do next for a proposal (alias for /help).",
    similes: ["what now", "next step", "what next"],
    examples: [
        [
            { user: "user", content: { text: "/whatnow #p1" } },
            { user: "assistant", content: { text: "Next step for #p1..." } },
        ],
    ],
    validate: async () => true,
    handler: helpProposalAction.handler,
};
export { helpProposalAction, whatnowAction };
export default helpProposalAction;
