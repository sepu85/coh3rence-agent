import { newId } from "../util/ids";
import { ProposalManager } from "../util/proposals";
function getProposalManager() {
    const db = global.rawDatabase;
    if (!db)
        throw new Error("Database not initialized");
    return new ProposalManager(db);
}
// Enhanced patterns to detect proposal-specific consensus signals
const CONSENT_PATTERNS = [
    /^\/(agree|consent)\b/i,
    /\b(i agree|sounds good|\+1|consent)\b/i,
    /consent\s+#p(\d+)/i,
    /^👍$/
];
const STAND_ASIDE_PATTERNS = [
    /^\/stand[_-]aside\b/i,
    /\bstand\s+aside\b/i,
    /stand[_-]aside\s+#p(\d+)/i
];
const BLOCK_PATTERNS = [
    /^\/block\b/i,
    /\b(strong objection|block this|i block)\b/i,
    /block\s+#p(\d+)/i
];
// Confusion detection for help triggers
const CONFUSION_PATTERNS = [
    /\b(what now|what's next|how does (this|consensus) work|explain (stage|consensus))\b/i,
    /\b(what do we do now|where are we|next step)\b/i,
    /^\?+$/
];
function matchAny(text, patterns) {
    return patterns.some((r) => r.test(text));
}
function extractProposalFromSignal(text) {
    const match = text.match(/#p(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}
const nlConsensusEvaluator = {
    name: "nl-consensus-evaluator",
    description: "Detects consensus signals, confusion, and records them with proposal context.",
    similes: ["detect signals", "consensus signal", "vote signal", "help detection"],
    examples: [],
    validate: async () => true,
    handler: async (runtime, message) => {
        try {
            const text = message?.content?.text ?? "";
            if (!text)
                return;
            const roomId = message?.room?.id ?? message?.roomId;
            const userId = message?.user?.id ?? message?.userId;
            const proposalManager = getProposalManager();
            // Check for confusion/help patterns first
            if (matchAny(text, CONFUSION_PATTERNS)) {
                // Get most recent active proposal if no specific proposal mentioned
                const proposalNumbers = proposalManager.extractProposalNumbers(text);
                let targetProposal = null;
                if (proposalNumbers.length > 0) {
                    targetProposal = await proposalManager.getProposal(roomId, proposalNumbers[0]);
                }
                else {
                    const activeProposals = await proposalManager.getActiveProposals(roomId);
                    if (activeProposals.length > 0) {
                        targetProposal = activeProposals[activeProposals.length - 1];
                    }
                }
                if (targetProposal) {
                    // Check throttling - don't explain same proposal too frequently
                    const timeSinceLastExplain = Date.now() - targetProposal.lastExplainedAt;
                    if (timeSinceLastExplain < 10 * 60 * 1000) { // 10 minutes
                        return; // Skip if explained recently
                    }
                    // Trigger help for this proposal
                    const helpMessage = {
                        ...message,
                        content: { text: `/help #p${targetProposal.proposalNumber}` }
                    };
                    // Find and execute help action
                    const helpAction = runtime.actions.find((a) => a.name === "help");
                    if (helpAction) {
                        await helpAction.handler(runtime, helpMessage);
                    }
                }
                return;
            }
            // Check for consensus signals
            let signal = null;
            if (matchAny(text, CONSENT_PATTERNS))
                signal = "consent";
            else if (matchAny(text, STAND_ASIDE_PATTERNS))
                signal = "stand-aside";
            else if (matchAny(text, BLOCK_PATTERNS))
                signal = "block";
            if (!signal)
                return;
            // Try to extract proposal number from signal
            let proposalNumber = extractProposalFromSignal(text);
            // If no specific proposal mentioned, use most recent active proposal
            if (!proposalNumber) {
                const activeProposals = await proposalManager.getActiveProposals(roomId);
                if (activeProposals.length === 0) {
                    return; // No active proposals to signal on
                }
                proposalNumber = activeProposals[activeProposals.length - 1].proposalNumber;
            }
            const proposal = await proposalManager.getProposal(roomId, proposalNumber);
            if (!proposal)
                return;
            // Only record signals for proposals in TESTING stage
            if (proposal.stage !== "TESTING") {
                return;
            }
            // Record the interaction in proposal system
            await proposalManager.addInteraction({
                proposalId: proposal.id,
                userId,
                type: signal,
                content: text,
            });
            // Also save to memories for compatibility
            await runtime.databaseAdapter.createMemory({
                id: newId(),
                roomId: roomId,
                userId: userId,
                agentId: runtime.agentId,
                type: "consensus-signal",
                content: { text: `${signal} #p${proposalNumber}: ${text}` },
                createdAt: Date.now(),
            });
            // Check if we should move to consensus or blocked state
            await checkForConsensusCompletion(runtime, proposal, proposalManager);
        }
        catch (error) {
            console.error("Error in nlConsensusEvaluator:", error);
        }
    },
};
// Helper function to check if consensus process is complete
async function checkForConsensusCompletion(runtime, proposal, proposalManager) {
    const interactions = await proposalManager.getInteractions(proposal.id);
    const signals = interactions.filter(i => ["consent", "stand-aside", "block"].includes(i.type));
    const blocks = signals.filter(s => s.type === "block");
    // If there are any blocks, mark as blocked
    if (blocks.length > 0) {
        await proposalManager.updateProposalStage(proposal.id, "BLOCKED");
        return;
    }
    // Could add logic here to check for sufficient consent
    // For now, we'll keep proposals in TESTING until manually moved
}
export { nlConsensusEvaluator };
export default nlConsensusEvaluator;
