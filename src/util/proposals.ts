// src/util/proposals.ts
import { newId, type UUID } from "./ids";

export type ProposalStage = "CLARIFYING" | "TESTING" | "CONSENSED" | "BLOCKED";

export interface Proposal {
  id: string;
  proposalNumber: number;
  roomId: string;
  title: string;
  content: string;
  authorId: string;
  stage: ProposalStage;
  createdAt: number;
  updatedAt: number;
  lastExplainedAt: number;
}

export interface ProposalInteraction {
  id: string;
  proposalId: string;
  userId: string;
  type: "concern" | "amendment" | "consent" | "stand-aside" | "block";
  content: string;
  createdAt: number;
}

export class ProposalManager {
  constructor(private db: any) {}

  async createProposal(opts: {
    roomId: string;
    title: string;
    content: string;
    authorId: string;
  }): Promise<Proposal> {
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

    const proposal: Proposal = {
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
    `).run(
      proposal.id,
      proposal.proposalNumber,
      proposal.roomId,
      proposal.title,
      proposal.content,
      proposal.authorId,
      proposal.stage,
      proposal.createdAt,
      proposal.updatedAt,
      proposal.lastExplainedAt
    );

    return proposal;
  }

  async getProposal(roomId: string, proposalNumber: number): Promise<Proposal | null> {
    const row = this.db.prepare(`
      SELECT * FROM proposals
      WHERE roomId = ? AND proposalNumber = ?
    `).get(roomId, proposalNumber);

    return row || null;
  }

  async getProposalById(proposalId: string): Promise<Proposal | null> {
    const row = this.db.prepare(`
      SELECT * FROM proposals WHERE id = ?
    `).get(proposalId);

    return row || null;
  }

  async getActiveProposals(roomId: string): Promise<Proposal[]> {
    const rows = this.db.prepare(`
      SELECT * FROM proposals
      WHERE roomId = ? AND stage IN ('CLARIFYING', 'TESTING')
      ORDER BY proposalNumber ASC
    `).all(roomId);

    return rows || [];
  }

  async getAllProposals(roomId: string): Promise<Proposal[]> {
    const rows = this.db.prepare(`
      SELECT * FROM proposals
      WHERE roomId = ?
      ORDER BY proposalNumber ASC
    `).all(roomId);

    return rows || [];
  }

  async updateProposalStage(proposalId: string, stage: ProposalStage): Promise<void> {
    this.db.prepare(`
      UPDATE proposals
      SET stage = ?, updatedAt = ?
      WHERE id = ?
    `).run(stage, Date.now(), proposalId);
  }

  async updateLastExplained(proposalId: string): Promise<void> {
    this.db.prepare(`
      UPDATE proposals
      SET lastExplainedAt = ?
      WHERE id = ?
    `).run(Date.now(), proposalId);
  }

  async addInteraction(opts: {
    proposalId: string;
    userId: string;
    type: ProposalInteraction["type"];
    content: string;
  }): Promise<void> {
    const { proposalId, userId, type, content } = opts;

    this.db.prepare(`
      INSERT INTO proposal_interactions (id, proposalId, userId, type, content, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId(), proposalId, userId, type, content, Date.now());
  }

  async getInteractions(proposalId: string): Promise<ProposalInteraction[]> {
    const rows = this.db.prepare(`
      SELECT * FROM proposal_interactions
      WHERE proposalId = ?
      ORDER BY createdAt ASC
    `).all(proposalId);

    return rows || [];
  }

  formatProposalTag(proposalNumber: number): string {
    return `#p${proposalNumber}`;
  }

  parseProposalTag(text: string): number | null {
    const match = text.match(/#p(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  extractProposalNumbers(text: string): number[] {
    const matches = text.match(/#p(\d+)/g);
    if (!matches) return [];
    return matches.map(match => parseInt(match.slice(2), 10));
  }
}