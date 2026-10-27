#!/usr/bin/env node
"use strict";

// One-time, interactive bootstrap for the first active Hashti super admin.
// Run with: docker compose exec -it backend node scripts/bootstrapHashtiSuperAdmin.cjs
// This script never deletes records and refuses to run while an active super admin exists.

const readline = require("node:readline/promises");
const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

function askLine(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return rl.question(question).then(
    (answer) => {
      rl.close();
      return answer.trim();
    },
    (error) => {
      rl.close();
      throw error;
    }
  );
}

function askHidden(question) {
  const input = process.stdin;

  if (!input.isTTY || typeof input.setRawMode !== "function") {
    return Promise.reject(
      new Error("An interactive terminal is required. Run docker compose exec with -it.")
    );
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const previousRawMode = input.isRaw;

    const cleanup = () => {
      input.removeListener("data", onData);
      if (input.isTTY && typeof input.setRawMode === "function") {
        input.setRawMode(Boolean(previousRawMode));
      }
      process.stdout.write("\n");
    };

    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Input cancelled."));
          return;
        }

        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }

        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
          continue;
        }

        if (character >= " " && character !== "\u001b") {
          value += character;
        }
      }
    };

    process.stdout.write(question);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function bootstrap() {
  const mobile = await askLine("Hashti mobile (09xxxxxxxxx): ");
  const firstName = await askLine("First name: ");
  const lastName = await askLine("Last name: ");
  const password = await askHidden("Initial password (12+ characters, input hidden): ");

  if (!/^09\d{9}$/.test(mobile)) {
    throw new Error("Mobile must contain 11 digits and start with 09.");
  }
  if (!firstName || firstName.length > 120 || !lastName || lastName.length > 120) {
    throw new Error("First name and last name are required (maximum 120 characters each).");
  }
  if (password.length < 12 || password.length > 200) {
    throw new Error("Password must contain between 12 and 200 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(
    async (tx) => {
      const activeSuperAdminCount = await tx.user.count({
        where: {
          role: UserRole.HASHTI,
          isActive: true,
          isSuperAdmin: true,
        },
      });

      if (activeSuperAdminCount > 0) {
        throw new Error("ACTIVE_SUPER_ADMIN_ALREADY_EXISTS");
      }

      const existingUser = await tx.user.findUnique({
        where: { mobile },
        select: {
          id: true,
          role: true,
          isActive: true,
          isSuperAdmin: true,
        },
      });

      if (existingUser && existingUser.role !== UserRole.HASHTI) {
        throw new Error("MOBILE_ALREADY_USED_BY_ANOTHER_ROLE");
      }

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash,
              isActive: true,
              isSuperAdmin: true,
            },
            select: {
              id: true,
              mobile: true,
              role: true,
              isActive: true,
              isSuperAdmin: true,
            },
          })
        : await tx.user.create({
            data: {
              mobile,
              passwordHash,
              role: UserRole.HASHTI,
              isActive: true,
              isSuperAdmin: true,
            },
            select: {
              id: true,
              mobile: true,
              role: true,
              isActive: true,
              isSuperAdmin: true,
            },
          });

      const existingStaff = await tx.hashtiStaff.findUnique({
        where: { mobile },
        select: { id: true },
      });

      if (existingStaff) {
        await tx.hashtiStaff.update({
          where: { mobile },
          data: { firstName, lastName, isActive: true },
        });
      } else {
        await tx.hashtiStaff.create({
          data: { mobile, firstName, lastName, isActive: true },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          actorUserId: user.id,
          actorMobile: user.mobile,
          actorRole: UserRole.HASHTI,
          action: "HASHTI_SUPER_ADMIN_BOOTSTRAPPED",
          targetType: "USER",
          targetId: user.id,
          details: {
            accountPreviouslyExisted: Boolean(existingUser),
            previousIsActive: existingUser?.isActive ?? null,
            previousIsSuperAdmin: existingUser?.isSuperAdmin ?? null,
            role: UserRole.HASHTI,
          },
        },
      });

      return {
        user,
        existingAccountPromoted: Boolean(existingUser),
      };
    },
    { isolationLevel: "Serializable" }
  );

  console.log("\nHASHTI_SUPER_ADMIN_BOOTSTRAPPED");
  console.log(JSON.stringify(result, null, 2));
  console.log("Password and password hash were not printed.");
  console.log("Sign in with this mobile and password, then open the Hashti dashboard.");
}

bootstrap()
  .catch((error) => {
    const code = error instanceof Error ? error.message : String(error);
    if (code === "ACTIVE_SUPER_ADMIN_ALREADY_EXISTS") {
      console.error("Bootstrap stopped: an active Hashti super admin already exists.");
    } else if (code === "MOBILE_ALREADY_USED_BY_ANOTHER_ROLE") {
      console.error("Bootstrap stopped: this mobile belongs to a non-Hashti account.");
    } else if (code === "P2034") {
      console.error("Bootstrap stopped due to a concurrent database change. Re-check admin status and try again only if no active super admin exists.");
    } else {
      console.error("HASHTI_SUPER_ADMIN_BOOTSTRAP_FAILED:", code);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
