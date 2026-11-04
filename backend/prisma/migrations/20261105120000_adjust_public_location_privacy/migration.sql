-- Recalculate stable public listing coordinates with a 100m–300m
-- displacement from the exact property location.
WITH seeded AS (
  SELECT
    pl.id,
    p."latitudeExact" AS latitude_exact,
    p."longitudeExact" AS longitude_exact,
    (
      (('x' || substr(md5(pl.id::text), 1, 8))::bit(32)::bigint)::double precision
      / 4294967295.0
    ) AS angle_fraction,
    (
      (('x' || substr(md5(pl.id::text), 9, 8))::bit(32)::bigint)::double precision
      / 4294967295.0
    ) AS radius_fraction
  FROM property_listings pl
  INNER JOIN properties p ON p.id = pl."propertyId"
  WHERE p."latitudeExact" IS NOT NULL
    AND p."longitudeExact" IS NOT NULL
),
offsets AS (
  SELECT
    id,
    latitude_exact,
    longitude_exact,
    angle_fraction * 2 * pi() AS angle,
    sqrt(10000 + radius_fraction * 80000) AS distance_meters
  FROM seeded
)
UPDATE property_listings pl
SET
  "latitudePublic" = round((
    o.latitude_exact
    + cos(o.angle) * o.distance_meters / 111320.0
  )::numeric, 6)::double precision,
  "longitudePublic" = round((
    o.longitude_exact
    + sin(o.angle) * o.distance_meters
      / (111320.0 * greatest(abs(cos(radians(o.latitude_exact))), 0.2))
  )::numeric, 6)::double precision
FROM offsets o
WHERE pl.id = o.id;
