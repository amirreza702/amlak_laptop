import {
  createManagedAgentSubscription,
  upgradeManagedAgentSubscription,
  type ManagedAgentSubscriptionInput,
} from "../repository/agentSubscriptionManagementRepository";

/**
 * Hashti operations use repository transactions so subscription changes
 * cannot commit without their corresponding audit entry.
 */
export const createManagedAgentSubscriptionService = (
  input: ManagedAgentSubscriptionInput
) => createManagedAgentSubscription(input);

export const upgradeManagedAgentSubscriptionService = (
  input: ManagedAgentSubscriptionInput
) => upgradeManagedAgentSubscription(input);
