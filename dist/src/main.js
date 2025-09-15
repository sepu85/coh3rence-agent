"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/main.ts
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@elizaos/core");
const adapter_sqlite_1 = require("@elizaos/adapter-sqlite");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const client_telegram_1 = require("@elizaos/client-telegram");
// Custom actions/evaluators
const facilitation_1 = require("./actions/facilitation");
const help_1 = __importDefault(require("./actions/help"));
const natural_language_1 = require("./evaluators/natural-language");
// ...inside MemoryCache:
class MemoryCache {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        const hit = this.store.get(key);
        if (!hit)
            return undefined;
        if (hit.expiresAt && Date.now() > hit.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return hit.value;
    }
    // 👇 change the signature to match eliza's CacheOptions
    async set(key, value, options) {
        // CacheOptions is currently a structural type; handle common fields defensively
        const ttlMs = 
        // try common spellings if present
        // @ts-expect-error - accommodate different shapes
        options?.ttlMs ?? options?.ttlMilliseconds ?? options?.ttl ?? undefined;
        const namespace = 
        // @ts-expect-error - accommodate different shapes
        options?.namespace;
        this.store.set(key, {
            value,
            ns: namespace,
            expiresAt: typeof ttlMs === "number" ? Date.now() + ttlMs : undefined,
        });
    }
    async delete(key) {
        this.store.delete(key);
    }
    async clearNamespace(namespace) {
        for (const [k, v] of this.store) {
            if (v.ns === namespace)
                this.store.delete(k);
        }
    }
}
const db = new better_sqlite3_1.default("./data/db.sqlite", { fileMustExist: false });
/**
 * ✅ Ensure required SQLite tables exist
 */
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
  `);
}
async function main() {
    try {
        // 1) Load character
        const characterPath = path_1.default.resolve("characters/coh3rence.character.json");
        const character = JSON.parse(fs_1.default.readFileSync(characterPath, "utf8"));
        // 2) Token (OpenAI)
        const token = process.env.OPENAI_API_KEY ||
            character?.settings?.secrets?.OPENAI_API_KEY ||
            "";
        if (!token)
            throw new Error("❌ Missing OPENAI_API_KEY (.env)");
        // 3) DB (SQLite) + schema check
        const sqlite = new better_sqlite3_1.default("./db.sqlite", { fileMustExist: false });
        ensureSchema(sqlite);
        const db = new adapter_sqlite_1.SqliteDatabaseAdapter(sqlite);
        // 4) Runtime (register actions/evaluators)
        const runtime = new core_1.AgentRuntime({
            databaseAdapter: db,
            token,
            modelProvider: core_1.ModelProviderName.OPENAI,
            character,
            actions: [
                facilitation_1.proposeAction,
                facilitation_1.concernAction,
                facilitation_1.amendAction,
                facilitation_1.testConsensusAction,
                facilitation_1.statusAction,
                help_1.default,
            ],
            evaluators: [natural_language_1.nlConsensusEvaluator],
            providers: [],
            services: [],
            managers: [],
            cacheManager: new MemoryCache(),
        });
        // 5) Start Telegram (or warn if missing)
        if (!character.clients?.includes("telegram")) {
            console.warn('⚠️ character.clients does not include "telegram" — starting anyway.');
        }
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.warn("⚠️ TELEGRAM_BOT_TOKEN missing in .env — Telegram client may fail.");
        }
        await client_telegram_1.TelegramClientInterface.start(runtime);
        console.log(`✅ Coh3rence agent running. Clients: telegram`);
    }
    catch (err) {
        console.error("❌ Failed to start agent:", err);
        process.exit(1);
    }
}
main();
