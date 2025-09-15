"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nlConsensusEvaluator = void 0;
const ids_1 = require("../util/ids");
// escape + in +1, otherwise it's a quantifier
const AGREE = [/^\/agree\b/i, /\b(i agree|sounds good|\+1)\b/i];
const STAND_ASIDE = [/^\/stand-aside\b/i, /\bstand aside\b/i];
const BLOCK = [/^\/block\b/i, /\bstrong objection|block this\b/i];
function matchAny(text, patterns) {
    return patterns.some((r) => r.test(text));
}
exports.nlConsensusEvaluator = {
    name: "nl-consensus-evaluator",
    description: "Detects quick consensus signals (/agree, /stand-aside, /block) and records them.",
    similes: ["detect signals", "consensus signal", "vote signal"],
    // NOTE: keep empty to satisfy stricter type in your Eliza version
    examples: [],
    validate: async () => true,
    handler: async (runtime, message) => {
        const text = message?.content?.text ?? "";
        if (!text)
            return;
        let signal = null;
        if (matchAny(text, AGREE))
            signal = "agree";
        else if (matchAny(text, STAND_ASIDE))
            signal = "stand-aside";
        else if (matchAny(text, BLOCK))
            signal = "block";
        if (!signal)
            return;
        const roomId = message?.room?.id ?? message?.roomId;
        const userId = message?.user?.id ?? message?.userId;
        await runtime.databaseAdapter.createMemory({
            id: (0, ids_1.newId)(),
            roomId: roomId,
            userId: userId,
            agentId: runtime.agentId,
            type: "consensus-signal",
            content: { text: `${signal}: ${text}` },
            createdAt: Date.now(),
        });
    },
};
exports.default = exports.nlConsensusEvaluator;
