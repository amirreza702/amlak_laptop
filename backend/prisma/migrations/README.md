# Prisma migration note

The migration in this folder is an additive change for an already-existing Hashti schema.

- It does not drop tables, columns, enums, or data.
- It adds agent review metadata and a new admin audit table.
- Existing rows with `agents.isVerified = true` are backfilled to `verificationStatus = VERIFIED`.
- The existing `isVerified` column remains for compatibility with earlier code.

**Do not run this migration yet.** The existing database migration baseline is intentionally still postponed. Before applying Prisma Migrate to the existing database, take a full backup and prepare/verify the baseline separately. This single additive migration is not a complete migration history and cannot initialize a clean database by itself.

Also do not start/rebuild the full Docker Compose stack as a substitute for testing: the current backend Compose command runs `prisma db push`, which can change the schema. The migration was prepared only; it has not been executed against any database.
