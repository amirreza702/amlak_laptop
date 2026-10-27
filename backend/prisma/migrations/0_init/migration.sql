-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'OWNER', 'AGENT', 'HASHTI');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'LAND', 'SHOP', 'OFFICE', 'GARDEN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'FULL_DEPOSIT', 'RENT');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_OWNER_APPROVAL', 'PENDING_HASHTI_VERIFICATION', 'PUBLISHED', 'REJECTED', 'EXPIRED', 'PAUSED', 'SOLD', 'RENTED');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('VACANT', 'OWNER_OCCUPIED', 'TENANT_OCCUPIED');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('OWNER', 'AGENT', 'HASHTI');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('SIX_DANG', 'SHARED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SINGLE_SHEET', 'OLD_DEED', 'OFFICIAL_CONTRACT', 'ORDINARY_CONTRACT');

-- CreateEnum
CREATE TYPE "LandTenure" AS ENUM ('FREEHOLD', 'ENDOWMENT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PropertyAgentStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ViewingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'VIEWING_SCHEDULED', 'VIEWING_COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MAIN_IMAGE', 'IMAGE', 'FLOOR_PLAN');

-- CreateEnum
CREATE TYPE "RenovationStatus" AS ENUM ('NO_RENOVATION', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "PriceChangeType" AS ENUM ('INITIAL', 'PRICE_CHANGE');

-- CreateEnum
CREATE TYPE "PropertyHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'OWNERSHIP_CHANGED', 'VERIFICATION_CHANGED', 'LISTING_CHANGED', 'LOCATION_CHANGED', 'PRICE_CHANGED', 'ARCHIVED', 'RESTORED', 'OTHER');

-- CreateEnum
CREATE TYPE "DuplicateDecision" AS ENUM ('SAME_PROPERTY', 'DIFFERENT_PROPERTY');

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('REQUESTED', 'PAID', 'SCHEDULED', 'CAPTURED', 'PROCESSING', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('CUSTOMER_TO_AGENT', 'OWNER_TO_AGENT', 'AGENT_TO_CUSTOMER', 'AGENT_TO_OWNER', 'CUSTOMER_TO_PROPERTY', 'CUSTOMER_TO_OWNER', 'OWNER_TO_CUSTOMER', 'AGENT_TO_PROPERTY', 'HASHTI_TO_AGENT');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('SUBMITTED', 'CALCULATED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_property_favorites" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_property_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_search_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "city" TEXT NOT NULL,
    "budget" DECIMAL(65,30),
    "description" TEXT,
    "hashtiVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_search_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "agencyName" TEXT,
    "address" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_access_logs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "searchRequestId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hashti_staff" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hashti_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "registrationSource" "RegistrationSource" NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitudeExact" DOUBLE PRECISION NOT NULL,
    "longitudeExact" DOUBLE PRECISION NOT NULL,
    "latitudePublic" DOUBLE PRECISION,
    "longitudePublic" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "rooms" INTEGER,
    "yearBuilt" INTEGER,
    "floor" INTEGER,
    "unitNumber" TEXT,
    "totalUnits" INTEGER,
    "parkingCount" INTEGER,
    "parkingType" TEXT,
    "parkingNumber" TEXT,
    "hasElevator" BOOLEAN,
    "hasStorage" BOOLEAN,
    "hasBalcony" BOOLEAN,
    "hasYard" BOOLEAN,
    "heatingSystem" TEXT,
    "coolingSystem" TEXT,
    "documentType" "DocumentType",
    "ownershipType" "OwnershipType",
    "landTenure" "LandTenure",
    "description" TEXT,
    "renovationStatus" "RenovationStatus",
    "renovationYear" INTEGER,
    "occupancyStatus" "OccupancyStatus" NOT NULL DEFAULT 'VACANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastConfirmedAt" TIMESTAMP(3),
    "confirmUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "salePrice" DECIMAL(65,30),
    "depositAmount" DECIMAL(65,30),
    "rentAmount" DECIMAL(65,30),
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "property_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_owners" (
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "share" DOUBLE PRECISION NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_owners_pkey" PRIMARY KEY ("propertyId","ownerId")
);

-- CreateTable
CREATE TABLE "property_agents" (
    "propertyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "PropertyAgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvedByOwner" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFirstRegistrant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "property_agents_pkey" PRIMARY KEY ("propertyId","agentId")
);

-- CreateTable
CREATE TABLE "property_media" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "changeType" "PriceChangeType" NOT NULL,
    "salePrice" DECIMAL(65,30),
    "depositAmount" DECIMAL(65,30),
    "rentAmount" DECIMAL(65,30),
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_history" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "action" "PropertyHistoryAction" NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "performedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_cases" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" TEXT NOT NULL,
    "verificationCaseId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_reviews" (
    "id" TEXT NOT NULL,
    "primaryPropertyId" TEXT NOT NULL,
    "candidatePropertyId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "decision" "DuplicateDecision",
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_tours_360" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "TourStatus" NOT NULL DEFAULT 'REQUESTED',
    "publishedUrl" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "virtual_tours_360_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_orders" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "gateway" TEXT,
    "transactionId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_requests" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "status" "ViewingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "viewingRequestId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "customerId" TEXT,
    "ownerId" TEXT,
    "agentId" TEXT,
    "propertyId" TEXT,
    "score" INTEGER,
    "comment" TEXT,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_results" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "calculatedScore" DOUBLE PRECISION NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "evaluation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_formulas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exact_location_access_logs" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "exact_location_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_archives" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "transactionType" "TransactionType",
    "archivedReason" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_subscriptions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "planId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_access_usage" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_access_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "monthlyContactLimit" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_key" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "customer_property_favorites_customerId_createdAt_idx" ON "customer_property_favorites"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_property_favorites_propertyId_idx" ON "customer_property_favorites"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_property_favorites_customerId_propertyId_key" ON "customer_property_favorites"("customerId", "propertyId");

-- CreateIndex
CREATE INDEX "property_search_requests_customerId_createdAt_idx" ON "property_search_requests"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "property_search_requests_city_idx" ON "property_search_requests"("city");

-- CreateIndex
CREATE INDEX "property_search_requests_status_idx" ON "property_search_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "owners_userId_key" ON "owners"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_userId_key" ON "agents"("userId");

-- CreateIndex
CREATE INDEX "contact_access_logs_agentId_accessedAt_idx" ON "contact_access_logs"("agentId", "accessedAt");

-- CreateIndex
CREATE INDEX "contact_access_logs_customerId_accessedAt_idx" ON "contact_access_logs"("customerId", "accessedAt");

-- CreateIndex
CREATE INDEX "contact_access_logs_searchRequestId_idx" ON "contact_access_logs"("searchRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_access_logs_agentId_searchRequestId_key" ON "contact_access_logs"("agentId", "searchRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "hashti_staff_mobile_key" ON "hashti_staff"("mobile");

-- CreateIndex
CREATE INDEX "properties_city_district_idx" ON "properties"("city", "district");

-- CreateIndex
CREATE INDEX "properties_propertyType_idx" ON "properties"("propertyType");

-- CreateIndex
CREATE INDEX "properties_registrationSource_idx" ON "properties"("registrationSource");

-- CreateIndex
CREATE INDEX "properties_occupancyStatus_idx" ON "properties"("occupancyStatus");

-- CreateIndex
CREATE INDEX "properties_confirmUntil_idx" ON "properties"("confirmUntil");

-- CreateIndex
CREATE UNIQUE INDEX "property_listings_propertyId_key" ON "property_listings"("propertyId");

-- CreateIndex
CREATE INDEX "property_listings_transactionType_idx" ON "property_listings"("transactionType");

-- CreateIndex
CREATE INDEX "property_listings_status_idx" ON "property_listings"("status");

-- CreateIndex
CREATE INDEX "property_listings_salePrice_idx" ON "property_listings"("salePrice");

-- CreateIndex
CREATE INDEX "property_listings_depositAmount_idx" ON "property_listings"("depositAmount");

-- CreateIndex
CREATE INDEX "property_listings_rentAmount_idx" ON "property_listings"("rentAmount");

-- CreateIndex
CREATE INDEX "property_owners_ownerId_idx" ON "property_owners"("ownerId");

-- CreateIndex
CREATE INDEX "property_agents_agentId_idx" ON "property_agents"("agentId");

-- CreateIndex
CREATE INDEX "property_media_propertyId_sortOrder_idx" ON "property_media"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "price_history_propertyId_changedAt_idx" ON "price_history"("propertyId", "changedAt");

-- CreateIndex
CREATE INDEX "property_history_propertyId_createdAt_idx" ON "property_history"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "verification_cases_propertyId_status_idx" ON "verification_cases"("propertyId", "status");

-- CreateIndex
CREATE INDEX "duplicate_reviews_primaryPropertyId_idx" ON "duplicate_reviews"("primaryPropertyId");

-- CreateIndex
CREATE INDEX "duplicate_reviews_candidatePropertyId_idx" ON "duplicate_reviews"("candidatePropertyId");

-- CreateIndex
CREATE INDEX "virtual_tours_360_propertyId_status_idx" ON "virtual_tours_360"("propertyId", "status");

-- CreateIndex
CREATE INDEX "viewing_requests_propertyId_status_idx" ON "viewing_requests"("propertyId", "status");

-- CreateIndex
CREATE INDEX "viewing_requests_customerId_status_idx" ON "viewing_requests"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_viewingRequestId_key" ON "conversations"("viewingRequestId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "evaluations_type_idx" ON "evaluations"("type");

-- CreateIndex
CREATE INDEX "evaluations_agentId_idx" ON "evaluations"("agentId");

-- CreateIndex
CREATE INDEX "evaluations_propertyId_idx" ON "evaluations"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_results_evaluationId_key" ON "evaluation_results"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_formulas_name_version_key" ON "evaluation_formulas"("name", "version");

-- CreateIndex
CREATE INDEX "exact_location_access_logs_propertyId_accessedAt_idx" ON "exact_location_access_logs"("propertyId", "accessedAt");

-- CreateIndex
CREATE INDEX "exact_location_access_logs_userId_accessedAt_idx" ON "exact_location_access_logs"("userId", "accessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "property_archives_propertyId_key" ON "property_archives"("propertyId");

-- CreateIndex
CREATE INDEX "agent_subscriptions_agentId_status_idx" ON "agent_subscriptions"("agentId", "status");

-- CreateIndex
CREATE INDEX "agent_subscriptions_expiresAt_idx" ON "agent_subscriptions"("expiresAt");

-- CreateIndex
CREATE INDEX "agent_subscriptions_planId_idx" ON "agent_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "contact_access_usage_agentId_periodStart_idx" ON "contact_access_usage"("agentId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "contact_access_usage_agentId_periodStart_key" ON "contact_access_usage"("agentId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_plans_level_idx" ON "subscription_plans"("level");

-- CreateIndex
CREATE INDEX "subscription_plans_status_idx" ON "subscription_plans"("status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_property_favorites" ADD CONSTRAINT "customer_property_favorites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_property_favorites" ADD CONSTRAINT "customer_property_favorites_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_search_requests" ADD CONSTRAINT "property_search_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_access_logs" ADD CONSTRAINT "contact_access_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_access_logs" ADD CONSTRAINT "contact_access_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_access_logs" ADD CONSTRAINT "contact_access_logs_searchRequestId_fkey" FOREIGN KEY ("searchRequestId") REFERENCES "property_search_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_agents" ADD CONSTRAINT "property_agents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_agents" ADD CONSTRAINT "property_agents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_history" ADD CONSTRAINT "property_history_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_verificationCaseId_fkey" FOREIGN KEY ("verificationCaseId") REFERENCES "verification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_reviews" ADD CONSTRAINT "duplicate_reviews_primaryPropertyId_fkey" FOREIGN KEY ("primaryPropertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_reviews" ADD CONSTRAINT "duplicate_reviews_candidatePropertyId_fkey" FOREIGN KEY ("candidatePropertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_tours_360" ADD CONSTRAINT "virtual_tours_360_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_orders" ADD CONSTRAINT "tour_orders_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "virtual_tours_360"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_viewingRequestId_fkey" FOREIGN KEY ("viewingRequestId") REFERENCES "viewing_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_archives" ADD CONSTRAINT "property_archives_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_subscriptions" ADD CONSTRAINT "agent_subscriptions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_subscriptions" ADD CONSTRAINT "agent_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_access_usage" ADD CONSTRAINT "contact_access_usage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

