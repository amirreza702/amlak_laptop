/**
 * ============================================================
 * Evaluation Service
 * ============================================================
 *
 * منطق Business مربوط به Evaluation در این Service قرار دارد.
 *
 * ارزیاب‌ها:
 * - Customer
 * - Owner
 * - Agent
 * - Hashti
 *
 * اهداف:
 * - Customer
 * - Owner
 * - Agent
 * - Property
 *
 * ============================================================
 */

import {
  createEvaluation,
  findEvaluatorUserById,
  findCustomerById,
  findOwnerById,
  findAgentById,
  findPropertyById,
  findCustomerByUserId,
  findOwnerByUserId,
  findAgentByUserId,
} from "../repository/evaluationRepository";

/**
 * ============================================================
 * انواع Evaluation
 * ============================================================
 */

type EvaluationType =
  | "CUSTOMER_TO_AGENT"
  | "OWNER_TO_AGENT"
  | "AGENT_TO_CUSTOMER"
  | "AGENT_TO_OWNER"
  | "CUSTOMER_TO_PROPERTY"
  | "CUSTOMER_TO_OWNER"
  | "OWNER_TO_CUSTOMER"
  | "AGENT_TO_PROPERTY"
  | "HASHTI_TO_AGENT";

/**
 * ============================================================
 * ورودی ایجاد Evaluation
 * ============================================================
 */

interface CreateEvaluationInput {
  type: EvaluationType;

  evaluatorUserId: string;

  customerId?: string;
  ownerId?: string;
  agentId?: string;
  propertyId?: string;

  score?: number;
  comment?: string;
}

/**
 * ============================================================
 * ثبت Evaluation
 * ============================================================
 */

export const createEvaluationService = async (
  data: CreateEvaluationInput
) => {
  /**
   * ----------------------------------------------------------
   * بررسی وجود User ارزیاب
   * ----------------------------------------------------------
   */

  const evaluator =
    await findEvaluatorUserById(
      data.evaluatorUserId
    );

  if (!evaluator) {
    throw new Error("Evaluator user not found");
  }

  /**
   * ----------------------------------------------------------
   * بررسی فعال بودن User
   * ----------------------------------------------------------
   */

  if (!evaluator.isActive) {
    throw new Error("Evaluator user is inactive");
  }

  if (
  data.score !== undefined &&
  (!Number.isInteger(data.score) ||
    data.score < 1 ||
    data.score > 5)
) {
  throw new Error(
    "Score must be an integer between 1 and 5"
  );
}

  /**
   * ----------------------------------------------------------
   * تعیین منطق بر اساس نوع Evaluation
   * ----------------------------------------------------------
   */

  switch (data.type) {
    /**
     * ========================================================
     * Customer → Agent
     * ========================================================
     */

    case "CUSTOMER_TO_AGENT": {
      if (evaluator.role !== "CUSTOMER") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.agentId) {
        throw new Error(
          "Agent is required for this evaluation"
        );
      }

      const customer =
        await findCustomerByUserId(
          data.evaluatorUserId
        );

      if (!customer) {
        throw new Error(
          "Evaluator customer not found"
        );
      }

      const agent =
        await findAgentById(data.agentId);

      if (!agent) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      if (
        agent.userId ===
        data.evaluatorUserId
      ) {
        throw new Error(
          "User cannot evaluate themselves"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        customerId: customer.id,
        agentId: agent.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Owner → Agent
     * ========================================================
     */

    case "OWNER_TO_AGENT": {
      if (evaluator.role !== "OWNER") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.agentId) {
        throw new Error(
          "Agent is required for this evaluation"
        );
      }

      const owner =
        await findOwnerByUserId(
          data.evaluatorUserId
        );

      if (!owner) {
        throw new Error(
          "Evaluator owner not found"
        );
      }

      const agent =
        await findAgentById(data.agentId);

      if (!agent) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      if (
        agent.userId ===
        data.evaluatorUserId
      ) {
        throw new Error(
          "User cannot evaluate themselves"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        ownerId: owner.id,
        agentId: agent.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Agent → Customer
     * ========================================================
     */

    case "AGENT_TO_CUSTOMER": {
      if (evaluator.role !== "AGENT") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.customerId) {
        throw new Error(
          "Customer is required for this evaluation"
        );
      }

      const agent =
        await findAgentByUserId(
          data.evaluatorUserId
        );

      if (!agent) {
        throw new Error(
          "Evaluator agent not found"
        );
      }

      const customer =
        await findCustomerById(
          data.customerId
        );

      if (!customer) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      if (
        customer.userId ===
        data.evaluatorUserId
      ) {
        throw new Error(
          "User cannot evaluate themselves"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        agentId: agent.id,
        customerId: customer.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Agent → Owner
     * ========================================================
     */

    case "AGENT_TO_OWNER": {
      if (evaluator.role !== "AGENT") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.ownerId) {
        throw new Error(
          "Owner is required for this evaluation"
        );
      }

      const agent =
        await findAgentByUserId(
          data.evaluatorUserId
        );

      if (!agent) {
        throw new Error(
          "Evaluator agent not found"
        );
      }

      const owner =
        await findOwnerById(
          data.ownerId
        );

      if (!owner) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      if (
        owner.userId ===
        data.evaluatorUserId
      ) {
        throw new Error(
          "User cannot evaluate themselves"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        agentId: agent.id,
        ownerId: owner.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Customer → Property
     * ========================================================
     */

    case "CUSTOMER_TO_PROPERTY": {
      if (evaluator.role !== "CUSTOMER") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.propertyId) {
        throw new Error(
          "Property is required for this evaluation"
        );
      }

      const customer =
        await findCustomerByUserId(
          data.evaluatorUserId
        );

      if (!customer) {
        throw new Error(
          "Evaluator customer not found"
        );
      }

      const property =
        await findPropertyById(
          data.propertyId
        );

      if (!property) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        customerId: customer.id,
        propertyId: property.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Customer → Owner
     * ========================================================
     */

    case "CUSTOMER_TO_OWNER": {
      if (evaluator.role !== "CUSTOMER") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.ownerId) {
        throw new Error(
          "Owner is required for this evaluation"
        );
      }

      const customer =
        await findCustomerByUserId(
          data.evaluatorUserId
        );

      if (!customer) {
        throw new Error(
          "Evaluator customer not found"
        );
      }

      const owner =
        await findOwnerById(
          data.ownerId
        );

      if (!owner) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      if (
        owner.userId ===
        data.evaluatorUserId
      ) {
        throw new Error(
          "User cannot evaluate themselves"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        customerId: customer.id,
        ownerId: owner.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Owner → Customer
     * ========================================================
     */

    case "OWNER_TO_CUSTOMER": {
      if (evaluator.role !== "OWNER") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.customerId) {
        throw new Error(
          "Customer is required for this evaluation"
        );
      }

      const owner =
        await findOwnerByUserId(
          data.evaluatorUserId
        );

      if (!owner) {
        throw new Error(
          "Evaluator owner not found"
        );
      }

      const customer =
        await findCustomerById(
          data.customerId
        );

      if (!customer) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      if (
        customer.userId ===
        data.evaluatorUserId
      ) {
        throw new Error(
          "User cannot evaluate themselves"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        ownerId: owner.id,
        customerId: customer.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Agent → Property
     * ========================================================
     */

    case "AGENT_TO_PROPERTY": {
      if (evaluator.role !== "AGENT") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.propertyId) {
        throw new Error(
          "Property is required for this evaluation"
        );
      }

      const agent =
        await findAgentByUserId(
          data.evaluatorUserId
        );

      if (!agent) {
        throw new Error(
          "Evaluator agent not found"
        );
      }

      const property =
        await findPropertyById(
          data.propertyId
        );

      if (!property) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        agentId: agent.id,
        propertyId: property.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    /**
     * ========================================================
     * Hashti → Agent
     * ========================================================
     */

    case "HASHTI_TO_AGENT": {
      if (evaluator.role !== "HASHTI") {
        throw new Error(
          "Evaluator role is not allowed for this evaluation type"
        );
      }

      if (!data.agentId) {
        throw new Error(
          "Agent is required for this evaluation"
        );
      }

      const agent =
        await findAgentById(
          data.agentId
        );

      if (!agent) {
        throw new Error(
          "Evaluation target not found"
        );
      }

      if (
        agent.userId ===
        data.evaluatorUserId
      ) {
        throw new Error(
          "User cannot evaluate themselves"
        );
      }

      return createEvaluation({
        type: data.type,
        evaluatorUserId: data.evaluatorUserId,
        agentId: agent.id,
        score: data.score,
        comment: normalizeComment(data.comment),
      });
    }

    default:
      throw new Error(
        "Unsupported evaluation type"
      );
  }
};

/**
 * ============================================================
 * نرمال‌سازی Comment
 * ============================================================
 */

const normalizeComment = (
  comment?: string
) => {
  if (comment === undefined) {
    return undefined;
  }

  const value = comment.trim();

  return value === ""
    ? undefined
    : value;
};