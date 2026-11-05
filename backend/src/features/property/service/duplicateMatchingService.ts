import type { Property } from "@prisma/client";
import { findPropertyById, findPropertiesWithinRadius, findPropertyByIdWithContacts, findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import { calculatePropertySimilarity } from "./propertySimilarityService";
import { getPropertyVisibility, projectPropertyForActor } from "./propertyAuthorizationService";

export const DUPLICATE_MATCHING_RADIUS_METERS = 1000;
export const DUPLICATE_MATCHING_THRESHOLD = 0.80;

export interface DuplicateMatchProperty {
  id: string;
  propertyType: Property["propertyType"];
  city: string;
  district: string | null;
  area: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  latitudeExact: number | null;
  longitudeExact: number | null;
  latitudePublic: number | null;
  longitudePublic: number | null;
  mapLocation: { latitude: number; longitude: number; precision: "APPROXIMATE" } | null;
  address: string;
  postalCode: null;
  ownerFirstName: null;
  ownerLastName: null;
  ownerMobile: null;
  creatorMobile: null;
  owners: [];
}

export interface DuplicateMatchResult {
  property: DuplicateMatchProperty;
  distanceMeters: number;
  similarityScore: number;
}

export interface PropertySimilaritySummary {
  maximumSimilarityScore: number;
  matches: DuplicateMatchResult[];
}

/**
 * خروجی Matching هرگز اطلاعات خصوصی ملک کاندید را افشا نمی‌کند.
 * مختصات دقیق فقط برای محاسبه داخلی فاصله استفاده می‌شود؛ خروجی همواره
 * مختصات عمومی و محدوده تقریبی را برمی‌گرداند.
 */
export const getPropertySimilaritySummaryService = async (
  propertyId: string,
  actor: { id: string; role: string; isActive?: boolean },
): Promise<PropertySimilaritySummary> => {
  const authorizationContext = await findPropertyAuthorizationContextById(propertyId);
  if (!authorizationContext) throw new Error("ملک مورد نظر برای Matching پیدا نشد.");
  const allowed = await authorizePropertyAction(actor, "VIEW_DUPLICATE_MATCHES", authorizationContext);
  if (!allowed) throw new Error("DUPLICATE_MATCHES_FORBIDDEN");

  const primaryProperty = await findPropertyById(propertyId);
  if (!primaryProperty) throw new Error("ملک مورد نظر برای Matching پیدا نشد.");

  const candidates = await findPropertiesWithinRadius(
    primaryProperty.latitudeExact,
    primaryProperty.longitudeExact,
    DUPLICATE_MATCHING_RADIUS_METERS,
    propertyId,
  );

  const scored = candidates.map((candidate) => ({
    property: candidate.property,
    distanceMeters: candidate.distanceMeters,
    similarityScore: calculatePropertySimilarity(primaryProperty, candidate.property),
  }));

  const maximumSimilarityScore = scored.reduce(
    (maximum, match) => Math.max(maximum, match.similarityScore),
    0,
  );

  const matches = await Promise.all(scored
    .filter((match) => match.similarityScore >= DUPLICATE_MATCHING_THRESHOLD)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .map(async (match): Promise<DuplicateMatchResult> => {
      const fullCandidate = await findPropertyByIdWithContacts(match.property.id);
      if (!fullCandidate) throw new Error("ملک مشابه دیگر در دسترس نیست.");

      // تصمیم Policy برای این کاندید محاسبه می‌شود، اما Matching اطلاعات مالک
      // یا مختصات دقیق را حتی در حالت مجاز بودن نیز در خروجی فهرست نمی‌دهد.
      const visibility = await getPropertyVisibility(actor, fullCandidate);
      const projected = projectPropertyForActor(fullCandidate, visibility, {
        exposeCreatorContact: false,
      });
      const latitudePublic = fullCandidate.listing?.latitudePublic ?? null;
      const longitudePublic = fullCandidate.listing?.longitudePublic ?? null;
      return {
        property: {
          id: fullCandidate.id,
          propertyType: fullCandidate.propertyType,
          city: projected.city ?? fullCandidate.city,
          district: projected.district ?? fullCandidate.district,
          area: fullCandidate.area,
          rooms: fullCandidate.rooms,
          yearBuilt: fullCandidate.yearBuilt,
          latitudeExact: null,
          longitudeExact: null,
          latitudePublic,
          longitudePublic,
          mapLocation: latitudePublic != null && longitudePublic != null
            ? { latitude: latitudePublic, longitude: longitudePublic, precision: "APPROXIMATE" }
            : null,
          address: [fullCandidate.city, fullCandidate.district, "محدوده تقریبی"].filter(Boolean).join("، "),
          postalCode: null,
          ownerFirstName: null,
          ownerLastName: null,
          ownerMobile: null,
          creatorMobile: null,
          owners: [],
        },
        // فاصله دقیق برای جلوگیری از استنتاج موقعیت دقیق گرد می‌شود.
        distanceMeters: Math.round(match.distanceMeters / 100) * 100,
        similarityScore: match.similarityScore,
      };
    }));

  return { maximumSimilarityScore, matches };
};

/** API Matching فقط خلاصه امن ملک‌های مشابه را برمی‌گرداند. */
export const findDuplicateMatchesService = async (
  propertyId: string,
  actor: { id: string; role: string; isActive?: boolean },
): Promise<DuplicateMatchResult[]> => {
  const summary = await getPropertySimilaritySummaryService(propertyId, actor);
  return summary.matches;
};
