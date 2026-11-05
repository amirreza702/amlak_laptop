import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import {
  deleteAgentPrivateNote,
  findAgentProfileByNotesId,
  findAgentProfileForNotes,
  listAgentPrivateNotes,
  saveAgentPrivateNote,
} from "../repository/agentPrivateNotesRepository";

const allowedEntityTypes = new Set(["property", "owner", "customer", "request"]);

async function getFreshActor(tx: Prisma.TransactionClient, actor: AuthorizationActor, expectedRole: "AGENT" | "HASHTI") {
  const user = await tx.user.findUnique({
    where: { id: actor.id },
    select: { id: true, role: true, isActive: true, isSuperAdmin: true },
  });
  if (!user || user.role !== expectedRole || user.isActive !== true || actor.role !== expectedRole) {
    throw new Error("PRIVATE_NOTE_FORBIDDEN");
  }
  return { actor: { ...actor, role: user.role, isActive: user.isActive }, isSuperAdmin: user.isSuperAdmin };
}

function validateNoteInput(entityType: string, entityId: string, note: string) {
  if (!allowedEntityTypes.has(entityType) || !entityId.trim() || note.length > 10000) {
    throw new Error("INVALID_PRIVATE_NOTE_DATA");
  }
}

export async function getMyPrivateNotesService(actor: AuthorizationActor) {
  return prisma.$transaction(async (tx) => {
    const fresh = await getFreshActor(tx, actor, "AGENT");
    const agent = await findAgentProfileForNotes(actor.id, tx);
    if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");
    const allowed = await authorize("privateNote", "LIST_OWN", {
      actor: fresh.actor,
      resource: { id: agent.id, data: { isOwnAgentNote: true, isActive: true } },
    });
    if (!allowed) throw new Error("PRIVATE_NOTE_FORBIDDEN");
    return listAgentPrivateNotes(agent.id, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function upsertMyPrivateNoteService(
  actor: AuthorizationActor,
  entityType: string,
  entityId: string,
  note: string,
) {
  validateNoteInput(entityType, entityId, note);
  return prisma.$transaction(async (tx) => {
    const fresh = await getFreshActor(tx, actor, "AGENT");
    const agent = await findAgentProfileForNotes(actor.id, tx);
    if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");
    const action = note.trim() ? "UPSERT_OWN" : "DELETE_OWN";
    const allowed = await authorize("privateNote", action, {
      actor: fresh.actor,
      resource: { id: agent.id, data: { isOwnAgentNote: true, isActive: true } },
    });
    if (!allowed) throw new Error("PRIVATE_NOTE_FORBIDDEN");
    return note.trim()
      ? saveAgentPrivateNote(agent.id, entityType, entityId.trim(), note.trim(), tx)
      : deleteAgentPrivateNote(agent.id, entityType, entityId.trim(), tx).then(() => null);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getAllAgentPrivateNotesService(actor: AuthorizationActor) {
  return prisma.$transaction(async (tx) => {
    const fresh = await getFreshActor(tx, actor, "HASHTI");
    const allowed = await authorize("privateNote", "LIST_ALL", {
      actor: fresh.actor,
      resource: { data: { isSuperAdmin: fresh.isSuperAdmin, isActive: true } },
    });
    if (!allowed) throw new Error("PRIVATE_NOTE_SUPER_ADMIN_REQUIRED");
    return listAgentPrivateNotes(undefined, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function upsertAgentPrivateNoteAsAdminService(
  actor: AuthorizationActor,
  agentId: string,
  entityType: string,
  entityId: string,
  note: string,
) {
  validateNoteInput(entityType, entityId, note);
  return prisma.$transaction(async (tx) => {
    const fresh = await getFreshActor(tx, actor, "HASHTI");
    const action = note.trim() ? "UPSERT_ANY" : "DELETE_ANY";
    const allowed = await authorize("privateNote", action, {
      actor: fresh.actor,
      resource: { data: { isSuperAdmin: fresh.isSuperAdmin, isActive: true } },
    });
    if (!allowed) throw new Error("PRIVATE_NOTE_SUPER_ADMIN_REQUIRED");
    const agent = await findAgentProfileByNotesId(agentId, tx);
    if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");
    return note.trim()
      ? saveAgentPrivateNote(agent.id, entityType, entityId.trim(), note.trim(), tx)
      : deleteAgentPrivateNote(agent.id, entityType, entityId.trim(), tx).then(() => null);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
