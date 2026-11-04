-- Recalculate stable public listing coordinates with a 100m–300m
-- displacement from the exact property location.
WITH hashed AS (
  SELECT
    pl.id,
    p."latitudeExact" AS latitude_exact,
    p."longitudeExact" AS longitude_exact,
    decode(md5(pl.id::text), 'hex') AS hash_bytes
  FROM property_listings pl
  INNER JOIN properties p ON p.id = pl."propertyId"
  WHERE p."latitudeExact" IS NOT NULL
    AND p."longitudeExact" IS NOT NULL
),
seeded AS (
  SELECT
    id,
    latitude_exact,
    longitude_exact,
    (
      get_byte(hash_bytes, 0)::double precision * 16777216.0
      + get_byte(hash_bytes, 1)::double precision * 65536.0
      + get_byte(hash_bytes, 2)::double precision * 256.0
      + get_byte(hash_bytes, 3)::double precision
    ) / 4294967295.0 AS angle_fraction,
    (
      get_byte(hash_bytes, 4)::double precision * 16777216.0
      + get_byte(hash_bytes, 5)::double precision * 65536.0
      + get_byte(hash_bytes, 6)::double precision * 256.0
      + get_byte(hash_bytes, 7)::double precision
    ) / 4294967295.0 AS radius_fraction
  FROM hashed
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
