// src/util/proposals.ts
import { newId } from "./ids";
export class ProposalManager {
    constructor(db) {
        this.db = db;
    }
    async createProposal(opts) {
        const { roomId, title, content, authorId } = opts;
        // Get next proposal number for this room
        const result = this.db.prepare(`
      SELECT COALESCE(MAX(proposalNumber), 0) + 1 as nextNumber
      FROM proposals
      WHERE roomId = ?
    `).get(roomId);
        const proposalNumber = result.nextNumber;
        const id = newId();
        const now = Date.now();
        const proposal = {
            id,
            proposalNumber,
            roomId,
            title,
            content,
            authorId,
            stage: "CLARIFYING",
            createdAt: now,
            updatedAt: now,
            lastExplainedAt: 0,
        };
        this.db.prepare(`
      INSERT INTO proposals (id, proposalNumber, roomId, title, content, authorId, stage, createdAt, updatedAt, lastExplainedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(proposal.id, proposal.proposalNumber, proposal.roomId, proposal.title, proposal.content, proposal.authorId, proposal.stage, proposal.createdAt, proposal.updatedAt, proposal.lastExplainedAt);
        return proposal;
    }
    async getProposal(roomId, proposalNumber) {
        const row = this.db.prepare(`
      SELECT * FROM proposals
      WHERE roomId = ? AND proposalNumber = ?
    `).get(roomId, proposalNumber);
        return row || null;
    }
    async getProposalById(proposalId) {
        const row = this.db.prepare(`
      SELECT * FROM proposals WHERE id = ?
    `).get(proposalId);
        return row || null;
    }
    async getActiveProposals(roomId) {
        const rows = this.db.prepare(`
      SELECT * FROM proposals
      WHERE roomId = ? AND stage IN ('CLARIFYING', 'TESTING')
      ORDER BY proposalNumber ASC
    `).all(roomId);
        return rows || [];
    }
    async getAllProposals(roomId) {
        const rows = this.db.prepare(`
      SELECT * FROM proposals
      WHERE roomId = ?
      ORDER BY proposalNumber ASC
    `).all(roomId);
        return rows || [];
    }
    async updateProposalStage(proposalId, stage) {
        this.db.prepare(`
      UPDATE proposals
      SET stage = ?, updatedAt = ?
      WHERE id = ?
    `).run(stage, Date.now(), proposalId);
    }
    async updateLastExplained(proposalId) {
        this.db.prepare(`
      UPDATE proposals
      SET lastExplainedAt = ?
      WHERE id = ?
    `).run(Date.now(), proposalId);
    }
    async addInteraction(opts) {
        const { proposalId, userId, type, content } = opts;
        this.db.prepare(`
      INSERT INTO proposal_interactions (id, proposalId, userId, type, content, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId(), proposalId, userId, type, content, Date.now());
    }
    async getInteractions(proposalId) {
        const rows = this.db.prepare(`
      SELECT * FROM proposal_interactions
      WHERE proposalId = ?
      ORDER BY createdAt ASC
    `).all(proposalId);
        return rows || [];
    }
    formatProposalTag(proposalNumber) {
        return `#p${proposalNumber}`;
    }
    parseProposalTag(text) {
        const match = text.match(/#p(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }
    extractProposalNumbers(text) {
        const matches = text.match(/#p(\d+)/g);
        if (!matches)
            return [];
        return matches.map(match => parseInt(match.slice(2), 10));
    }
}
