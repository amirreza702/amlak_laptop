/**
 * Generate stable, slightly displaced public coordinates.
 *
 * Exact property coordinates must never be returned by public search.
 * A deterministic offset keeps the marker stable between requests while
 * separating it from the property's exact location.
 */
export function getPublicCoordinates(
  propertyId: string,
  latitudeExact: number,
  longitudeExact: number
): { latitude: number; longitude: number } {
  let hash = 2166136261;

  for (let index = 0; index < propertyId.length; index += 1) {
    hash ^= propertyId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0) / 0xffffffff;
  const angle = normalized * Math.PI * 2;
  const distanceMeters = 120 + ((hash >>> 8) % 101);
  const latitudeRadians = (latitudeExact * Math.PI) / 180;
  const metersPerDegree = 111_320;
  const longitudeScale = Math.max(Math.cos(latitudeRadians), 0.2);

  const latitude = latitudeExact +
    (Math.cos(angle) * distanceMeters) / metersPerDegree;
  const longitude = longitudeExact +
    (Math.sin(angle) * distanceMeters) / (metersPerDegree * longitudeScale);

  return {
    latitude: Number(latitude.toFixed(5)),
    longitude: Number(longitude.toFixed(5)),
  };
}
