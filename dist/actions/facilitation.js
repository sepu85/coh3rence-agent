import { newId } from "../util/ids";
import { ProposalManager } from "../util/proposals";
function extractAfterCommand(text, cmd) {
    const trimmed = (text || "").trim();
    if (!trimmed.toLowerCase().startsWith(cmd))
        return "";
    return trimmed.slice(cmd.length).trim();
}
function getProposalManager() {
    const db = global.rawDatabase;
    if (!db)
        throw new Error("Database not initialized");
    return new ProposalManager(db);
}
// Extract proposal title from content (first line or first 50 chars)
function extractTitle(content) {
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length <= 50)
        return firstLine;
    return content.slice(0, 47).trim() + "...";
}
// Stage explanation templates
const STAGE_EXPLANATIONS = {
    CLARIFYING: (pNum) => `
🔍 **Stage: Clarifying** — ${getProposalManager().formatProposalTag(pNum)}

Purpose: Make sure everyone understands the proposal.

What you can do now: Ask **clarifying questions** (not opinions).

Commands: \`/concern ${getProposalManager().formatProposalTag(pNum)} <text>\`, \`/amend ${getProposalManager().formatProposalTag(pNum)} <text>\`

Next step: If clear, we'll move to **concerns & amendments**, then test for consensus.`,
    TESTING: (pNum) => `
🧭 **Stage: Consensus Test** — ${getProposalManager().formatProposalTag(pNum)}

Respond with:
• **Consent**: "consent ${getProposalManager().formatProposalTag(pNum)}" or 👍
• **Concern**: \`/concern ${getProposalManager().formatProposalTag(pNum)} <text>\`
• **Block** (only for fundamental conflicts): "block ${getProposalManager().formatProposalTag(pNum)} <reason>"

Next step: If no unresolved concerns/blocks, we declare **consensus**; otherwise, return to amendments.`,
    CONSENSED: (pNum) => `
✅ **Decision** — ${getProposalManager().formatProposalTag(pNum)}

Result: **Consensus achieved** ✅`,
    BLOCKED: (pNum) => `
❌ **Decision** — ${getProposalManager().formatProposalTag(pNum)}

Result: **Blocked** ❌ (unresolved concerns need amendments)`
};
async function saveMemory(opts) {
    const { runtime, roomId, userId, agentId, type, text } = opts;
    await runtime.databaseAdapter.createMemory({
        id: newId(),
        roomId: roomId,
        userId: userId,
        agentId: agentId,
        type,
        content: { text },
        createdAt: Date.now(),
    });
}
/** ---------------- Propose ---------------- */
export const proposeAction = {
    name: "propose",
    description: "Create a new proposal with unique ID and initiate Formal Consensus process.",
    similes: ["submit proposal", "make a proposal", "put forward idea"],
    examples: [
        [
            { user: "user", content: { text: "/propose Adopt formal consensus process." } },
            { user: "assistant", content: { text: "✅ Proposal #p1 created and now in clarifying stage." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        try {
            const text = message?.content?.text ?? "";
            const proposalContent = extractAfterCommand(text, "/propose");
            if (!proposalContent) {
                return {
                    content: {
                        text: "Please use `/propose <your proposal>`.\nExample: `/propose Adopt the Formal Consensus process for our next meeting.`",
                    },
                };
            }
            const roomId = message?.room?.id ?? message?.roomId;
            const userId = message?.user?.id ?? message?.userId;
            if (!roomId || !userId) {
                return {
                    content: {
                        text: "❌ Error: Unable to identify room or user.",
                    },
                };
            }
            const proposalManager = getProposalManager();
            const title = extractTitle(proposalContent);
            const proposal = await proposalManager.createProposal({
                roomId,
                title,
                content: proposalContent,
                authorId: userId,
            });
            // Save to memories for compatibility
            await saveMemory({
                runtime,
                roomId,
                userId,
                agentId: runtime.agentId,
                type: "proposal",
                text: `${proposalManager.formatProposalTag(proposal.proposalNumber)}: ${proposalContent}`,
            });
            const response = `✅ **Proposal ${proposalManager.formatProposalTag(proposal.proposalNumber)} created**\n\n**${title}**\n\n${STAGE_EXPLANATIONS.CLARIFYING(proposal.proposalNumber)}`;
            return {
                content: {
                    text: response,
                },
            };
        }
        catch (error) {
            console.error("Error in proposeAction:", error);
            return {
                content: {
                    text: "❌ Error creating proposal. Please try again.",
                },
            };
        }
    },
};
/** ---------------- Concern ---------------- */
export const concernAction = {
    name: "concern",
    description: "Record a concern about a specific proposal.",
    similes: ["raise concern", "flag issue", "note worry"],
    examples: [
        [
            { user: "user", content: { text: "/concern #p1 This excludes async contributors." } },
            { user: "assistant", content: { text: "📝 Concern recorded for #p1." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        try {
            const text = message?.content?.text ?? "";
            const afterCmd = extractAfterCommand(text, "/concern");
            if (!afterCmd) {
                return {
                    content: {
                        text: "Please use `/concern #pN <your concern>`.\nExample: `/concern #p1 This might exclude async contributors.`",
                    },
                };
            }
            const roomId = message?.room?.id ?? message?.roomId;
            const userId = message?.user?.id ?? message?.userId;
            const proposalManager = getProposalManager();
            // Parse proposal number and concern text
            const proposalNumbers = proposalManager.extractProposalNumbers(afterCmd);
            if (proposalNumbers.length === 0) {
                return {
                    content: {
                        text: "Please specify which proposal: `/concern #pN <your concern>`",
                    },
                };
            }
            const proposalNumber = proposalNumbers[0];
            const proposal = await proposalManager.getProposal(roomId, proposalNumber);
            if (!proposal) {
                return {
                    content: {
                        text: `❌ Proposal ${proposalManager.formatProposalTag(proposalNumber)} not found.`,
                    },
                };
            }
            // Extract concern text (everything after #pN)
            const concernText = afterCmd.replace(/#p\d+\s*/, '').trim();
            if (!concernText) {
                return {
                    content: {
                        text: `Please include your concern: \`/concern ${proposalManager.formatProposalTag(proposalNumber)} <your concern>\``,
                    },
                };
            }
            await proposalManager.addInteraction({
                proposalId: proposal.id,
                userId,
                type: "concern",
                content: concernText,
            });
            // Save to memories for compatibility
            await saveMemory({
                runtime,
                roomId,
                userId,
                agentId: runtime.agentId,
                type: "concern",
                text: `${proposalManager.formatProposalTag(proposalNumber)}: ${concernText}`,
            });
            return {
                content: {
                    text: `📝 **Concern recorded** for ${proposalManager.formatProposalTag(proposalNumber)}\n\nConsider suggesting an amendment: \`/amend ${proposalManager.formatProposalTag(proposalNumber)} <suggestion>\``,
                },
            };
        }
        catch (error) {
            console.error("Error in concernAction:", error);
            return {
                content: {
                    text: "❌ Error recording concern. Please try again.",
                },
            };
        }
    },
};
/** ---------------- Amendment ---------------- */
export const amendAction = {
    name: "amend",
    description: "Suggest an amendment to a specific proposal.",
    similes: ["suggest change", "offer amendment", "propose edit"],
    examples: [
        [
            { user: "user", content: { text: "/amend #p1 Add 48h async review period." } },
            { user: "assistant", content: { text: "🔧 Amendment recorded for #p1." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        try {
            const text = message?.content?.text ?? "";
            const afterCmd = extractAfterCommand(text, "/amend");
            if (!afterCmd) {
                return {
                    content: {
                        text: "Please use `/amend #pN <your amendment>`.\nExample: `/amend #p1 Add an async round for feedback before finalizing.`",
                    },
                };
            }
            const roomId = message?.room?.id ?? message?.roomId;
            const userId = message?.user?.id ?? message?.userId;
            const proposalManager = getProposalManager();
            // Parse proposal number and amendment text
            const proposalNumbers = proposalManager.extractProposalNumbers(afterCmd);
            if (proposalNumbers.length === 0) {
                return {
                    content: {
                        text: "Please specify which proposal: `/amend #pN <your amendment>`",
                    },
                };
            }
            const proposalNumber = proposalNumbers[0];
            const proposal = await proposalManager.getProposal(roomId, proposalNumber);
            if (!proposal) {
                return {
                    content: {
                        text: `❌ Proposal ${proposalManager.formatProposalTag(proposalNumber)} not found.`,
                    },
                };
            }
            // Extract amendment text (everything after #pN)
            const amendmentText = afterCmd.replace(/#p\d+\s*/, '').trim();
            if (!amendmentText) {
                return {
                    content: {
                        text: `Please include your amendment: \`/amend ${proposalManager.formatProposalTag(proposalNumber)} <your amendment>\``,
                    },
                };
            }
            await proposalManager.addInteraction({
                proposalId: proposal.id,
                userId,
                type: "amendment",
                content: amendmentText,
            });
            // Save to memories for compatibility
            await saveMemory({
                runtime,
                roomId,
                userId,
                agentId: runtime.agentId,
                type: "amendment",
                text: `${proposalManager.formatProposalTag(proposalNumber)}: ${amendmentText}`,
            });
            return {
                content: {
                    text: `🔧 **Amendment recorded** for ${proposalManager.formatProposalTag(proposalNumber)}\n\nYou can check group alignment with \`/test ${proposalManager.formatProposalTag(proposalNumber)}\``,
                },
            };
        }
        catch (error) {
            console.error("Error in amendAction:", error);
            return {
                content: {
                    text: "❌ Error recording amendment. Please try again.",
                },
            };
        }
    },
};
/** ---------------- Test Consensus ---------------- */
export const testConsensusAction = {
    name: "test",
    description: "Move a proposal to testing stage and invite consensus responses.",
    similes: ["check consensus", "pulse the room", "consensus test", "testconsensus"],
    examples: [
        [
            { user: "user", content: { text: "/test #p1" } },
            {
                user: "assistant",
                content: {
                    text: "🧭 #p1 moved to testing stage. Please respond with consent, concerns, or blocks.",
                },
            },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        try {
            const text = message?.content?.text ?? "";
            const roomId = message?.room?.id ?? message?.roomId;
            const userId = message?.user?.id ?? message?.userId;
            const proposalManager = getProposalManager();
            // Parse proposal number from command
            const afterCmd = extractAfterCommand(text, "/test");
            let proposalNumber = null;
            if (afterCmd) {
                const proposalNumbers = proposalManager.extractProposalNumbers(afterCmd);
                if (proposalNumbers.length > 0) {
                    proposalNumber = proposalNumbers[0];
                }
            }
            // If no proposal specified, get most recent active proposal
            if (proposalNumber === null) {
                const activeProposals = await proposalManager.getActiveProposals(roomId);
                if (activeProposals.length === 0) {
                    return {
                        content: {
                            text: "❌ No active proposals found. Use `/test #pN` to specify a proposal.",
                        },
                    };
                }
                proposalNumber = activeProposals[activeProposals.length - 1].proposalNumber;
            }
            const proposal = await proposalManager.getProposal(roomId, proposalNumber);
            if (!proposal) {
                return {
                    content: {
                        text: `❌ Proposal ${proposalManager.formatProposalTag(proposalNumber)} not found.`,
                    },
                };
            }
            // Move proposal to testing stage
            await proposalManager.updateProposalStage(proposal.id, "TESTING");
            // Save to memories for compatibility
            await saveMemory({
                runtime,
                roomId,
                userId,
                agentId: runtime.agentId,
                type: "consensus-check",
                text: `Consensus test initiated for ${proposalManager.formatProposalTag(proposalNumber)}. Please respond with consent, concerns, or blocks.`,
            });
            const response = `🧭 **${proposalManager.formatProposalTag(proposalNumber)} moved to testing stage**\n\n**${proposal.title}**\n\n${STAGE_EXPLANATIONS.TESTING(proposalNumber)}`;
            return {
                content: {
                    text: response,
                },
            };
        }
        catch (error) {
            console.error("Error in testConsensusAction:", error);
            return {
                content: {
                    text: "❌ Error initiating consensus test. Please try again.",
                },
            };
        }
    },
};
/** ---------------- Status (summary) ---------------- */
export const statusAction = {
    name: "status",
    description: "Show status of all proposals or a specific proposal.",
    similes: ["summary", "where are we", "show status"],
    examples: [
        [
            { user: "user", content: { text: "/status" } },
            { user: "assistant", content: { text: "📊 *Current status* ..." } },
        ],
        [
            { user: "user", content: { text: "/status #p1" } },
            { user: "assistant", content: { text: "📊 Status for #p1 ..." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        try {
            const text = message?.content?.text ?? "";
            const roomId = message?.room?.id ?? message?.roomId;
            const userId = message?.user?.id ?? message?.userId;
            const proposalManager = getProposalManager();
            const afterCmd = extractAfterCommand(text, "/status");
            const proposalNumbers = afterCmd ? proposalManager.extractProposalNumbers(afterCmd) : [];
            // If specific proposal requested
            if (proposalNumbers.length > 0) {
                const proposalNumber = proposalNumbers[0];
                const proposal = await proposalManager.getProposal(roomId, proposalNumber);
                if (!proposal) {
                    return {
                        content: {
                            text: `❌ Proposal ${proposalManager.formatProposalTag(proposalNumber)} not found.`,
                        },
                    };
                }
                const interactions = await proposalManager.getInteractions(proposal.id);
                const concerns = interactions.filter(i => i.type === "concern");
                const amendments = interactions.filter(i => i.type === "amendment");
                const signals = interactions.filter(i => ["consent", "stand-aside", "block"].includes(i.type));
                let statusText = `📊 **Status for ${proposalManager.formatProposalTag(proposalNumber)}**\n\n`;
                statusText += `**Title:** ${proposal.title}\n`;
                statusText += `**Stage:** ${proposal.stage}\n`;
                statusText += `**Author:** <@${proposal.authorId}>\n\n`;
                if (concerns.length > 0) {
                    statusText += `**Concerns (${concerns.length}):**\n`;
                    concerns.forEach(c => statusText += `• ${c.content}\n`);
                    statusText += "\n";
                }
                if (amendments.length > 0) {
                    statusText += `**Amendments (${amendments.length}):**\n`;
                    amendments.forEach(a => statusText += `• ${a.content}\n`);
                    statusText += "\n";
                }
                if (signals.length > 0) {
                    statusText += `**Responses (${signals.length}):**\n`;
                    signals.forEach(s => statusText += `• ${s.type}: ${s.content}\n`);
                    statusText += "\n";
                }
                // Add stage explanation
                if (proposal.stage in STAGE_EXPLANATIONS) {
                    statusText += STAGE_EXPLANATIONS[proposal.stage](proposalNumber);
                }
                return { content: { text: statusText } };
            }
            // Show all proposals status
            const allProposals = await proposalManager.getAllProposals(roomId);
            if (allProposals.length === 0) {
                return {
                    content: {
                        text: "📊 **No proposals found**\n\nCreate a proposal with `/propose <your idea>`",
                    },
                };
            }
            let statusText = `📊 **All Proposals Status**\n\n`;
            const activeProposals = allProposals.filter(p => ["CLARIFYING", "TESTING"].includes(p.stage));
            const completedProposals = allProposals.filter(p => ["CONSENSED", "BLOCKED"].includes(p.stage));
            if (activeProposals.length > 0) {
                statusText += `**Active Proposals (${activeProposals.length}):**\n`;
                for (const proposal of activeProposals) {
                    const interactions = await proposalManager.getInteractions(proposal.id);
                    const concernCount = interactions.filter(i => i.type === "concern").length;
                    const amendmentCount = interactions.filter(i => i.type === "amendment").length;
                    statusText += `• ${proposalManager.formatProposalTag(proposal.proposalNumber)} **${proposal.title}** (${proposal.stage})`;
                    if (concernCount > 0 || amendmentCount > 0) {
                        statusText += ` - ${concernCount} concerns, ${amendmentCount} amendments`;
                    }
                    statusText += "\n";
                }
                statusText += "\n";
            }
            if (completedProposals.length > 0) {
                statusText += `**Completed Proposals (${completedProposals.length}):**\n`;
                completedProposals.forEach(proposal => {
                    statusText += `• ${proposalManager.formatProposalTag(proposal.proposalNumber)} **${proposal.title}** (${proposal.stage})\n`;
                });
                statusText += "\n";
            }
            statusText += `Use \`/status ${proposalManager.formatProposalTag(1)}\` for detailed view of a specific proposal.`;
            // Save to memories for compatibility
            await saveMemory({
                runtime,
                roomId,
                userId,
                agentId: runtime.agentId,
                type: "status",
                text: "Status summary requested.",
            });
            return { content: { text: statusText } };
        }
        catch (error) {
            console.error("Error in statusAction:", error);
            return {
                content: {
                    text: "❌ Error retrieving status. Please try again.",
                },
            };
        }
    },
};
