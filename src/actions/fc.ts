export type ProposalStatus = "DRAFT" | "CLARIFYING" | "TESTING" | "CONSENSED" | "BLOCKED";

export interface ProposalMemory {
  type: "proposal";
  proposalId: string; // e.g., "#p1"
  title: string;
  summary: string;
  author: string;     // telegram username or id
  status: ProposalStatus;
}

export interface ConcernMemory {
  type: "concern";
  proposalId: string;
  author: string;
  text: string;
}

export interface AmendmentMemory {
  type: "amendment";
  proposalId: string;
  author: string;
  text: string;
}