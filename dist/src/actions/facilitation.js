"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusAction = exports.testConsensusAction = exports.amendAction = exports.concernAction = exports.proposeAction = void 0;
const ids_1 = require("../util/ids");
function extractAfterCommand(text, cmd) {
    const trimmed = (text || "").trim();
    if (!trimmed.toLowerCase().startsWith(cmd))
        return "";
    return trimmed.slice(cmd.length).trim();
}
async function saveMemory(opts) {
    const { runtime, roomId, userId, agentId, type, text } = opts;
    await runtime.databaseAdapter.createMemory({
        id: (0, ids_1.newId)(),
        roomId: roomId,
        userId: userId,
        agentId: agentId,
        type,
        content: { text },
        createdAt: Date.now(),
    });
}
/** ---------------- Propose ---------------- */
exports.proposeAction = {
    name: "propose",
    description: "Capture a proposal into the room's memory.",
    similes: ["submit proposal", "make a proposal", "put forward idea"],
    examples: [
        [
            { user: "user", content: { text: "/propose Adopt formal consensus." } },
            { user: "assistant", content: { text: "✅ Proposal recorded." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        const text = message?.content?.text ?? "";
        const proposal = extractAfterCommand(text, "/propose");
        if (!proposal) {
            return {
                content: {
                    text: "Please use `/propose <your proposal>`.\nExample: `/propose Adopt the Formal Consensus process for our next meeting.`",
                },
            };
        }
        const roomId = message?.room?.id ?? message?.roomId;
        const userId = message?.user?.id ?? message?.userId;
        await saveMemory({
            runtime,
            roomId,
            userId,
            agentId: runtime.agentId,
            type: "proposal",
            text: proposal,
        });
        return {
            content: {
                text: "✅ Proposal recorded. Others may respond with `/concern` or `/amend`.",
            },
        };
    },
};
/** ---------------- Concern ---------------- */
exports.concernAction = {
    name: "concern",
    description: "Capture a concern related to a current proposal.",
    similes: ["raise concern", "flag issue", "note worry"],
    examples: [
        [
            { user: "user", content: { text: "/concern This excludes async folks." } },
            { user: "assistant", content: { text: "📝 Concern captured." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        const text = message?.content?.text ?? "";
        const concern = extractAfterCommand(text, "/concern");
        if (!concern) {
            return {
                content: {
                    text: "Please use `/concern <your concern>`.\nExample: `/concern This might exclude async contributors.`",
                },
            };
        }
        const roomId = message?.room?.id ?? message?.roomId;
        const userId = message?.user?.id ?? message?.userId;
        await saveMemory({
            runtime,
            roomId,
            userId,
            agentId: runtime.agentId,
            type: "concern",
            text: concern,
        });
        return {
            content: {
                text: "📝 Concern captured. Consider suggesting an amendment with `/amend <suggestion>`.",
            },
        };
    },
};
/** ---------------- Amendment ---------------- */
exports.amendAction = {
    name: "amend",
    description: "Capture a suggested amendment to a proposal.",
    similes: ["suggest change", "offer amendment", "propose edit"],
    examples: [
        [
            { user: "user", content: { text: "/amend Add 48h async review." } },
            { user: "assistant", content: { text: "🔧 Amendment noted." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        const text = message?.content?.text ?? "";
        const amendment = extractAfterCommand(text, "/amend");
        if (!amendment) {
            return {
                content: {
                    text: "Please use `/amend <your amendment>`.\nExample: `/amend Add an async round for feedback before finalizing.`",
                },
            };
        }
        const roomId = message?.room?.id ?? message?.roomId;
        const userId = message?.user?.id ?? message?.userId;
        await saveMemory({
            runtime,
            roomId,
            userId,
            agentId: runtime.agentId,
            type: "amendment",
            text: amendment,
        });
        return {
            content: {
                text: "🔧 Amendment noted. You can check group alignment with `/testconsensus`.",
            },
        };
    },
};
/** ---------------- Test Consensus ---------------- */
exports.testConsensusAction = {
    name: "testconsensus",
    description: "Invite the group to indicate if there are outstanding blocks/concerns.",
    similes: ["check consensus", "pulse the room", "consensus test"],
    examples: [
        [
            { user: "user", content: { text: "/testconsensus" } },
            {
                user: "assistant",
                content: {
                    text: "🧭 Consensus test initiated. Please respond with:\n• `/agree`\n• `/stand-aside <why>`\n• `/block <why>`",
                },
            },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        const roomId = message?.room?.id ?? message?.roomId;
        const userId = message?.user?.id ?? message?.userId;
        await saveMemory({
            runtime,
            roomId,
            userId,
            agentId: runtime.agentId,
            type: "consensus-check",
            text: "Facilitator requested a consensus test. Please respond with: `/agree`, `/stand-aside <why>`, or `/block <why>`.",
        });
        return {
            content: {
                text: "🧭 Consensus test initiated. Please respond with:\n• `/agree`\n• `/stand-aside <why>`\n• `/block <why>`",
            },
        };
    },
};
/** ---------------- Status (summary) ---------------- */
exports.statusAction = {
    name: "status",
    description: "Summarize proposals, concerns, and amendments in this room.",
    similes: ["summary", "where are we", "show status"],
    examples: [
        [
            { user: "user", content: { text: "/status" } },
            { user: "assistant", content: { text: "📊 *Current status* ..." } },
        ],
    ],
    validate: async () => true,
    handler: async (runtime, message) => {
        const roomId = message?.room?.id ?? message?.roomId;
        const mems = (await runtime.databaseAdapter.getMemoriesByRoom(roomId));
        const proposals = mems
            .filter((m) => m.type === "proposal")
            .map((m) => `• ${m.content?.text}`)
            .join("\n");
        const concerns = mems
            .filter((m) => m.type === "concern")
            .map((m) => `• ${m.content?.text}`)
            .join("\n");
        const amendments = mems
            .filter((m) => m.type === "amendment")
            .map((m) => `• ${m.content?.text}`)
            .join("\n");
        const out = [
            "📊 *Current status*",
            proposals ? `\n**Proposals**\n${proposals}` : "",
            concerns ? `\n**Concerns**\n${concerns}` : "",
            amendments ? `\n**Amendments**\n${amendments}` : "",
        ]
            .filter(Boolean)
            .join("\n");
        await saveMemory({
            runtime,
            roomId,
            userId: message?.user?.id ?? message?.userId,
            agentId: runtime.agentId,
            type: "status",
            text: "Status summary requested.",
        });
        return { content: { text: out || "No items recorded yet." } };
    },
};
