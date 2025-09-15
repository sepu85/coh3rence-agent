"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpProposalAction = void 0;
const ids_1 = require("../util/ids");
const HELP_TEXT = `
*Formal Consensus — Quick Guide*
Commands:
• /propose <text> — record a proposal
• /concern <text> — note a concern (non-blocking)
• /amend <text> — suggest an amendment
• /testconsensus — invite /agree, /stand-aside <why>, /block <why>
• /status — summary of proposals/concerns/amendments
`.trim();
exports.helpProposalAction = {
    name: "help",
    description: "Show help for proposal/consensus workflow.",
    similes: ["help", "guide", "commands", "how to"],
    examples: [
        [
            { user: "user", content: { text: "/help" } },
            { user: "assistant", content: { text: HELP_TEXT } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        const roomId = message?.room?.id ?? message?.roomId;
        const userId = message?.user?.id ?? message?.userId;
        await runtime.databaseAdapter.createMemory({
            id: (0, ids_1.newId)(),
            roomId: roomId,
            userId: userId,
            agentId: runtime.agentId,
            type: "help",
            content: { text: "Help viewed" },
            createdAt: Date.now(),
        });
        return { content: { text: HELP_TEXT } };
    },
};
exports.default = exports.helpProposalAction;
