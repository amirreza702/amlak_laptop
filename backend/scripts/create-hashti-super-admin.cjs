const readline = require("node:readline");
const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcrypt");

function askLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askSecret(question) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(new Error("Interactive terminal required. Run with docker compose exec -it backend."));
      return;
    }
    let value = "";
    output.write(question);
    input.setRawMode(true);
    input.resume();
    const finish = (error) => {
      input.removeListener("data", onData);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Cancelled by user."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u0008" || character === "\u007f") {
          if (value.length) { value = value.slice(0, -1); output.write("\b \b"); }
          continue;
        }
        if (character >= " ") { value += character; output.write("*"); }
      }
    };
    input.on("data", onData);
  });
}

async function main() {
  let prisma;
  let password = "";
  let confirmation = "";
  try {
    console.log("\nHashti Super Admin Setup");
    console.log("This one-time command creates the first super-admin account.");
    console.log("Existing login accounts are never overwritten.\n");
    const mobile = await askLine("Mobile number (09xxxxxxxxx): ");
    const firstName = await askLine("First name: ");
    const lastName = await askLine("Last name: ");
    password = await askSecret("Password (minimum 12 characters; hidden): ");
    confirmation = await askSecret("Confirm password (hidden): ");

    if (!/^09\d{9}$/.test(mobile)) throw new Error("Mobile must be an 11-digit Iranian number starting with 09.");
    if (!firstName || !lastName || firstName.length > 120 || lastName.length > 120) throw new Error("Valid first and last names are required.");
    if (password.length < 12 || password.length > 200) throw new Error("Password must contain 12 to 200 characters.");
    if (password !== confirmation) throw new Error("Passwords do not match.");
    if ((await askLine("Create the first super admin? Type YES to continue: ")).toUpperCase() !== "YES") {
      console.log("Cancelled. No account was created.");
      return;
    }

    prisma = new PrismaClient();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      if (await tx.user.count({ where: { isSuperAdmin: true } })) throw new Error("A super-admin account already exists. No changes were made.");
      if (await tx.user.findUnique({ where: { mobile }, select: { id: true } })) throw new Error("This mobile number already belongs to a login account. No changes were made.");
      const existingStaff = await tx.hashtiStaff.findUnique({ where: { mobile }, select: { id: true } });
      const user = await tx.user.create({
        data: { mobile, passwordHash, role: UserRole.HASHTI, isActive: true, isSuperAdmin: true },
        select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true },
      });
      if (existingStaff) {
        await tx.hashtiStaff.update({ where: { mobile }, data: { firstName, lastName, isActive: true } });
      } else {
        await tx.hashtiStaff.create({ data: { mobile, firstName, lastName, isActive: true } });
      }
      await tx.adminAuditLog.create({
        data: {
          actorUserId: user.id, actorMobile: user.mobile, actorRole: UserRole.HASHTI,
          action: "HASHTI_SUPER_ADMIN_BOOTSTRAPPED", targetType: "USER", targetId: user.id,
          details: { role: UserRole.HASHTI, isSuperAdmin: true, createdBy: "local-bootstrap" },
        },
      });
      return user;
    });
    console.log("\nHASHTI_SUPER_ADMIN_CREATED");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    password = "";
    confirmation = "";
    if (prisma) await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error("\nSUPER_ADMIN_SETUP_FAILED:", error.message || error);
  process.exitCode = 1;
});
