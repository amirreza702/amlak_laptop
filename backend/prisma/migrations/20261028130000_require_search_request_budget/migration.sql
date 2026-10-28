-- Budget is required for every new property search request.
-- Do not invent values for historical requests that have no budget recorded.
-- If legacy NULL rows exist, stop and require an explicit data decision before enforcing NOT NULL.
DO $$
DECLARE
  missing_budget_count BIGINT;
BEGIN
  SELECT COUNT(*)
    INTO missing_budget_count
  FROM "property_search_requests"
  WHERE "budget" IS NULL;

  IF missing_budget_count > 0 THEN
    RAISE EXCEPTION
      'Cannot require property_search_requests.budget: % existing rows have no budget. Review/backfill those rows with real values before retrying this migration.',
      missing_budget_count;
  END IF;
END $$;

ALTER TABLE "property_search_requests"
  ALTER COLUMN "budget" SET NOT NULL;
