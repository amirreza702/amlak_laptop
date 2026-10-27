import { findVerificationQueueCases, type VerificationQueueQuery } from "../repository/verificationQueueRepository";

export const getVerificationQueueService = async (query: VerificationQueueQuery) =>
  findVerificationQueueCases(query);
