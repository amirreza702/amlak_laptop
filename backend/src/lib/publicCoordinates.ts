import { createHash } from "node:crypto";

/**
 * Create stable public coordinates for one listing.
 *
 * The listing ID seeds a deterministic pseudo-random point that is
 * uniformly distributed across a disk with a maximum radius of 200m.
 * The generated point is stored on PropertyListing and is not exposed
 * as an input to public APIs.
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
  // sqrt makes points uniform by area, not clustered toward the center.
  const distanceMeters = Math.sqrt(radiusFraction) * 200;
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
