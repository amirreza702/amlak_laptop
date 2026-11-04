ALTER TABLE "property_listings"
  ADD COLUMN "latitudePublic" DOUBLE PRECISION,
  ADD COLUMN "longitudePublic" DOUBLE PRECISION;

-- Recreate a stable, uniformly distributed public point using the listing ID.
-- The first 8 bytes of MD5 provide two deterministic uniform values in [0, 1].
WITH seeded AS (
  SELECT
    pl."id",
    p."latitudeExact",
    p."longitudeExact",
    decode(md5(pl."id"), 'hex') AS seed
  FROM "property_listings" pl
  INNER JOIN "properties" p ON p."id" = pl."propertyId"
),
random_values AS (
  SELECT
    "id",
    "latitudeExact",
    "longitudeExact",
    (
      get_byte(seed, 0)::double precision * 16777216 +
      get_byte(seed, 1)::double precision * 65536 +
      get_byte(seed, 2)::double precision * 256 +
      get_byte(seed, 3)::double precision
    ) / 4294967295.0 AS angle_fraction,
    (
      get_byte(seed, 4)::double precision * 16777216 +
      get_byte(seed, 5)::double precision * 65536 +
      get_byte(seed, 6)::double precision * 256 +
      get_byte(seed, 7)::double precision
    ) / 4294967295.0 AS radius_fraction
  FROM seeded
)
UPDATE "property_listings" pl
SET
  "latitudePublic" = ROUND((
    rv."latitudeExact" +
    COS(rv.angle_fraction * 2 * PI()) * SQRT(rv.radius_fraction) * 200 / 111320.0
  )::numeric, 6)::double precision,
  "longitudePublic" = ROUND((
    rv."longitudeExact" +
    SIN(rv.angle_fraction * 2 * PI()) * SQRT(rv.radius_fraction) * 200 /
      (111320.0 * GREATEST(ABS(COS(RADIANS(rv."latitudeExact"))), 0.2))
  )::numeric, 6)::double precision
FROM random_values rv
WHERE pl."id" = rv."id";

ALTER TABLE "properties"
  DROP COLUMN "latitudePublic",
  DROP COLUMN "longitudePublic";
