import { findOwnerVerificationQueueProperties, type OwnerVerificationQueueQuery } from "../repository/verificationQueueRepository";

export async function getOwnerVerificationQueueService(query: OwnerVerificationQueueQuery) {
  return findOwnerVerificationQueueProperties(query);
}
