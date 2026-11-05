import { prisma } from "../../../lib/prisma";
import type { Prisma } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

export const findAgentProfileForNotes = (userId: string, db: Db = prisma) =>
  db.agent.findUnique({ where: { userId }, select: { id: true } });

export const findAgentProfileByNotesId = (agentId: string, db: Db = prisma) =>
  db.agent.findUnique({ where: { id: agentId }, select: { id: true } });

export const listAgentPrivateNotes = (agentId?: string, db: Db = prisma) => {
  if (agentId) {
    return db.agentPrivateNote.findMany({
      where: { agentId },
      orderBy: { updatedAt: "desc" },
    });
  }
  return db.agentPrivateNote.findMany({
    include: {
      agent: {
        select: {
          id: true, firstName: true, lastName: true,
          user: { select: { mobile: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const saveAgentPrivateNote = (
  agentId: string,
  entityType: string,
  entityId: string,
  note: string,
  db: Db = prisma,
) => db.agentPrivateNote.upsert({
  where: { agentId_entityType_entityId: { agentId, entityType, entityId } },
  create: { agentId, entityType, entityId, note },
  update: { note },
});

export const deleteAgentPrivateNote = (
  agentId: string,
  entityType: string,
  entityId: string,
  db: Db = prisma,
) => db.agentPrivateNote.deleteMany({ where: { agentId, entityType, entityId } });
