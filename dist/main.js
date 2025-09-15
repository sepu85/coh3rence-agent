// src/main.ts
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { AgentRuntime, ModelProviderName, } from "@elizaos/core";
import { SqliteDatabaseAdapter } from "@elizaos/adapter-sqlite";
import Database from "better-sqlite3";
import { TelegramClientInterface } from "@elizaos/client-telegram";
// Custom actions/evaluators (no file extensions; TS will compile to .js)
import { proposeAction, concernAction, amendAction, testConsensusAction, statusAction, } from "./actions/facilitation";
import { helpProposalAction, whatnowAction } from "./actions/help";
import { nlConsensusEvaluator } from "./evaluators/natural-language";
/**
 * Minimal in-memory cache for @elizaos/core.
 * Keep it simple: accept CacheOptions but ignore unknown fields to avoid type errors.
 */
class MemoryCache {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        return this.store.get(key);
    }
    async set(key, value, _options) {
        this.store.set(key, value);
    }
    async delete(key) {
        this.store.delete(key);
    }
    async clearNamespace(_namespace) {
        // No-op in this minimal impl (we're not namespacing keys)
    }
}
/** Ensure minimal schema exists if adapter expects tables later */
function ensureSchema(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      agentId TEXT NOT NULL,
      "unique" INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      proposalNumber INTEGER NOT NULL,
      roomId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      authorId TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'CLARIFYING',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastExplainedAt INTEGER DEFAULT 0,
      UNIQUE(roomId, proposalNumber)
    );

    CREATE TABLE IF NOT EXISTS proposal_interactions (
      id TEXT PRIMARY KEY,
      proposalId TEXT NOT NULL,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(proposalId) REFERENCES proposals(id)
    );
  `);
}
async function main() {
    try {
        // 1) Load character
        const characterPath = path.resolve(__dirname, "../characters/coh3rence.character.json");
        const character = JSON.parse(fs.readFileSync(characterPath, "utf8"));
        // 2) OpenAI token
        const token = process.env.OPENAI_API_KEY ||
            character?.settings?.secrets?.OPENAI_API_KEY ||
            "";
        if (!token)
            throw new Error("Missing OPENAI_API_KEY (.env)");
        // 3) SQLite + schema
        const dbPath = path.resolve(__dirname, "../data/db.sqlite");
        const sqlite = new Database(dbPath, { fileMustExist: false });
        ensureSchema(sqlite);
        const db = new SqliteDatabaseAdapter(sqlite);
        // Make raw database available for proposal management
        global.rawDatabase = sqlite;
        // 4) Runtime
        const runtime = new AgentRuntime({
            databaseAdapter: db,
            token,
            modelProvider: ModelProviderName.OPENAI,
            character,
            actions: [
                proposeAction,
                concernAction,
                amendAction,
                testConsensusAction,
                statusAction,
                helpProposalAction,
                whatnowAction,
            ],
            evaluators: [nlConsensusEvaluator],
            providers: [],
            services: [],
            managers: [],
            cacheManager: new MemoryCache(),
        });
        // 5) Telegram client
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.warn("⚠️ TELEGRAM_BOT_TOKEN missing in .env — Telegram may fail.");
        }
        await TelegramClientInterface.start(runtime);
        console.log("✅ Coh3rence agent running (telegram).");
    }
    catch (err) {
        console.error("❌ Failed to start agent:", err);
        process.exit(1);
    }
}
main();
