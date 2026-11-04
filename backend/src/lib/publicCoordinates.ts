import { createHash } from "node:crypto";

/**
 * Create stable public coordinates for one listing.
 *
 * The public point is deterministically displaced 100–300m from the
 * exact property location. It is stored per listing and remains stable
 * until the exact property location changes.
 */
export function getPublicCoordinates(
  listingId: string,
  latitudeExact: number,
  longitudeExact: number
): { latitude: number; longitude: number } {
  const seed = createHash("md5").update(listingId).digest();
  const angleFraction = seed.readUInt32BE(0) / 0xffffffff;
  const radiusFraction = seed.readUInt32BE(4) / 0xffffffff;

  const angle = angleFraction * Math.PI * 2;
  // Uniform distribution by area inside an annulus between 100m and 300m.
  const distanceMeters = Math.sqrt(
    100 * 100 + radiusFraction * (300 * 300 - 100 * 100)
  );
  const latitudeRadians = (latitudeExact * Math.PI) / 180;
  const metersPerDegree = 111_320;
  const longitudeScale = Math.max(Math.abs(Math.cos(latitudeRadians)), 0.2);

  const latitude = latitudeExact +
    (Math.cos(angle) * distanceMeters) / metersPerDegree;
  const longitude = longitudeExact +
    (Math.sin(angle) * distanceMeters) / (metersPerDegree * longitudeScale);

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}
