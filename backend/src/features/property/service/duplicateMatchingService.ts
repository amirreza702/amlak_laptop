import type { Property } from "@prisma/client";
import { findPropertyById, findPropertiesWithinRadius } from "../repository/propertyRepository";
import { calculatePropertySimilarity } from "./propertySimilarityService";

export const DUPLICATE_MATCHING_RADIUS_METERS = 1000;
export const DUPLICATE_MATCHING_THRESHOLD = 0.80;

export interface DuplicateMatchResult {
  property: Property;
  distanceMeters: number;
  similarityScore: number;
}

export interface PropertySimilaritySummary {
  maximumSimilarityScore: number;
  matches: DuplicateMatchResult[];
}

/** محاسبه یکپارچه بیشترین تشابه و کاندیداهای بالاتر از آستانه؛ شعاع فقط برای انتخاب کاندیداست. */
export const getPropertySimilaritySummaryService = async (
  propertyId: string
): Promise<PropertySimilaritySummary> => {
  const primaryProperty = await findPropertyById(propertyId);
  if (!primaryProperty) throw new Error("ملک مورد نظر برای Matching پیدا نشد.");

  const candidates = await findPropertiesWithinRadius(
    primaryProperty.latitudeExact,
    primaryProperty.longitudeExact,
    DUPLICATE_MATCHING_RADIUS_METERS,
    propertyId
  );

  const scored = candidates.map((candidate) => ({
    property: candidate.property,
    distanceMeters: candidate.distanceMeters,
    similarityScore: calculatePropertySimilarity(primaryProperty, candidate.property),
  }));

  const maximumSimilarityScore = scored.reduce(
    (maximum, match) => Math.max(maximum, match.similarityScore),
    0
  );

  const matches = scored
    .filter((match) => match.similarityScore >= DUPLICATE_MATCHING_THRESHOLD)
    .sort((a, b) => b.similarityScore - a.similarityScore);

  return { maximumSimilarityScore, matches };
};

/** API قدیمی Matching همان قرارداد قبلی را حفظ می‌کند و فقط کاندیداهای معتبر را برمی‌گرداند. */
export const findDuplicateMatchesService = async (
  propertyId: string
): Promise<DuplicateMatchResult[]> => {
  const summary = await getPropertySimilaritySummaryService(propertyId);
  return summary.matches;
};
