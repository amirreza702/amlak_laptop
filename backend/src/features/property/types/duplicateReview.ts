import type {
  DuplicateDecision,
} from "@prisma/client";

export interface DuplicateReview {
  id: string;

  primaryPropertyId: string;
  candidatePropertyId: string;

  similarityScore: number;

  decision: DuplicateDecision | null;

  reviewedBy: string | null;
  reviewedAt: Date | null;

  notes: string | null;

  createdAt: Date;
}