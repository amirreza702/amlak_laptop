-- Preserve old subscription and quota history while retiring these tables from the active Prisma model.
DO $$
BEGIN
  IF to_regclass('"agent_subscriptions"') IS NOT NULL
     AND to_regclass('"legacy_agent_subscriptions"') IS NULL THEN
    ALTER TABLE "agent_subscriptions" RENAME TO "legacy_agent_subscriptions";
  END IF;

  IF to_regclass('"contact_access_usage"') IS NOT NULL
     AND to_regclass('"legacy_contact_access_usage"') IS NULL THEN
    ALTER TABLE "contact_access_usage" RENAME TO "legacy_contact_access_usage";
  END IF;

  IF to_regclass('"subscription_plans"') IS NOT NULL
     AND to_regclass('"legacy_subscription_plans"') IS NULL THEN
    ALTER TABLE "subscription_plans" RENAME TO "legacy_subscription_plans";
  END IF;
END $$;
