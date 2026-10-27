-- Subscription and quota history is no longer used; remove the legacy tables.
DROP TABLE IF EXISTS "legacy_contact_access_usage";
DROP TABLE IF EXISTS "legacy_agent_subscriptions";
DROP TABLE IF EXISTS "legacy_subscription_plans";
