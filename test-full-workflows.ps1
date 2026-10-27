# Hashti — Isolated full business-workflow integration tests
# Run from the repository root (where docker-compose.yml/compose.yml exists):
# powershell -ExecutionPolicy Bypass -File .\test-full-workflows.ps1
#
# SAFETY:
# - Creates a uniquely named, disposable PostgreSQL database.
# - Runs Prisma db push ONLY against that new database.
# - Exercises business services using seeded synthetic data only.
# - Drops ONLY the uniquely named test database created by this run.
# - Does not connect test operations to the normal `amlak` database.
# - Does not test HTTP authorization; keep the existing test-access.ps1 for that.

$ErrorActionPreference = 'Stop'
$testDb = $null
$tempRunner = Join-Path (Get-Location) 'backend\test-workflow-runner.temp.ts'
$createdDb = $false

function Invoke-Compose {
  param([Parameter(Mandatory=$true)][string[]]$Args)
  & docker compose @Args
  if ($LASTEXITCODE -ne 0) { throw "docker compose command failed: docker compose $($Args -join ' ')" }
}

function Invoke-TestRunner {
  param([string]$DatabaseUrl)
  & docker compose exec -T -e "DATABASE_URL=$DatabaseUrl" backend npx tsx test-workflow-runner.temp.ts
  if ($LASTEXITCODE -ne 0) { throw 'The isolated business-workflow runner reported failures.' }
}

Write-Host 'هشتی — تست یکپارچه گردش‌کارهای کسب‌وکار (دیتابیس جداگانه)' -ForegroundColor Cyan
if (-not (Test-Path '.\docker-compose.yml') -and -not (Test-Path '.\compose.yml')) {
  throw 'این دستور را از پوشه اصلی پروژه، کنار docker-compose.yml اجرا کن.'
}
if (Test-Path $tempRunner) {
  throw 'فایل backend\test-workflow-runner.temp.ts از قبل وجود دارد. برای جلوگیری از بازنویسی، آن را بررسی/تغییرنام بده و دوباره اجرا کن.'
}

try {
  # Confirm required containers are running.
  $services = & docker compose ps --services --filter status=running
  if ($LASTEXITCODE -ne 0) { throw 'خواندن وضعیت Docker Compose ناموفق بود.' }
  foreach ($required in @('db','backend')) {
    if ($services -notcontains $required) { throw "سرویس '$required' در حال اجرا نیست. ابتدا Docker Compose را اجرا کن." }
  }

  # Read the connection URL from the running backend without printing credentials.
  # Capture the native command output first, then inspect its exit code separately.
  # This avoids Windows PowerShell pipeline/exit-code quirks when Docker writes stderr.
  $urlOutput = @(& docker compose exec -T backend printenv DATABASE_URL 2>$null)
  $urlExitCode = $LASTEXITCODE
  $originalUrl = (($urlOutput -join "`n").Trim())
  if ($urlExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($originalUrl)) {
    throw 'خواندن DATABASE_URL ناموفق بود. دستور «docker compose exec -T backend printenv DATABASE_URL» را جداگانه اجرا و وضعیت کانتینر backend را بررسی کن.'
  }
  if ($originalUrl -notmatch '^(?<prefix>.+:\d+/)(?<db>[^?]+)(?<query>\?.*)?$') {
    throw 'قالب DATABASE_URL قابل تشخیص نیست؛ دیتابیس اصلی را دست نمی‌زنم.'
  }
  $prefix = $Matches.prefix; $query = $Matches.query
  $stamp = Get-Date -Format 'yyyyMMddHHmmss'
  $suffix = ([Guid]::NewGuid().ToString('N')).Substring(0,6)
  $testDb = "amlak_wf_test_${stamp}_${suffix}"
  $testUrl = "$prefix$testDb$query"

  # Create a new database with a unique name; never reuse or overwrite one.
  & docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $testDb;"
  if ($LASTEXITCODE -ne 0) { throw 'ساخت دیتابیس تست ناموفق بود.' }
  $createdDb = $true

  Write-Host "دیتابیس موقت ساخته شد: $testDb" -ForegroundColor Gray
  Write-Host 'ساخت جداول Prisma فقط روی دیتابیس موقت...' -ForegroundColor Gray
  & docker compose exec -T -e "DATABASE_URL=$testUrl" backend npx prisma db push --skip-generate
  if ($LASTEXITCODE -ne 0) { throw 'Prisma db push روی دیتابیس تست ناموفق بود.' }

  $runner = @'
import { prisma } from "./src/lib/prisma";
import { UserRole, PropertyType, ListingStatus, TransactionType, VerificationStatus, DuplicateDecision } from "@prisma/client";
import { registerProperty } from "./src/features/property/service/propertyService";
import { createPropertyListingWithInitialPrice } from "./src/features/property/service/propertyListingService";
import { updatePropertyPrice } from "./src/features/property/service/propertyPriceService";
import { updatePropertyListingStatus } from "./src/features/property/service/propertyListingStatusService";
import { createVerificationCaseService, reviewVerificationCaseService } from "./src/features/property/service/verificationCaseService";
import { archivePropertyService, restorePropertyService } from "./src/features/property/service/propertyArchiveService";
import { findDuplicateMatchesService } from "./src/features/property/service/duplicateMatchingService";
import { createDuplicateReviewService, reviewDuplicateService } from "./src/features/property/service/duplicateReviewService";
import { addPropertyToFavoritesService, isPropertyFavoriteService, removePropertyFromFavoritesService } from "./src/features/favorite/service/customerPropertyFavoriteService";

let passed = 0;
let failed = 0;
const created: string[] = [];
function check(name: string, condition: unknown, detail = "") {
  if (condition) { passed++; console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ""}`); }
  else { failed++; console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ""}`); }
}
function assertOk(name: string, condition: unknown, detail = "") {
  check(name, condition, detail);
  if (!condition) throw new Error(`ASSERTION_FAILED:${name}`);
}

async function main() {
  const suffix = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const user = async (role: UserRole, tag: string) => prisma.user.create({
    data: { mobile: `09${String(700000000 + (Math.floor(Math.random()*90000000))).slice(0,9)}`, role, passwordHash: "integration-only", isActive: true }
  });
  // Profiles are synthetic and exist only in this disposable database.
  const customerUser = await user(UserRole.CUSTOMER, "customer");
  const ownerUser = await user(UserRole.OWNER, "owner");
  const agentUser = await user(UserRole.AGENT, "agent");
  const staffUser = await user(UserRole.HASHTI, "hashti");
  const customer = await prisma.customer.create({ data: { userId: customerUser.id, firstName: "Test", lastName: "Customer" } });
  const owner = await prisma.owner.create({ data: { userId: ownerUser.id, firstName: "Test", lastName: "Owner" } });
  const agent = await prisma.agent.create({ data: { userId: agentUser.id, firstName: "Test", lastName: "Agent", isVerified: true } });

  // 1. Property registration by agent and owner; history/relationships should be created.
  const agentReg = await registerProperty({
    agentId: agent.id, propertyType: PropertyType.APARTMENT, city: "شاهرود", district: "آزمایش", address: `ملک تست مشاور ${suffix}`,
    latitudeExact: 36.4243, longitudeExact: 54.9662, postalCode: `WF${suffix}01`, area: 100, rooms: 2
  } as any);
  const agentPropertyId = agentReg.property.id;
  created.push(agentPropertyId);
  const agentLink = await prisma.propertyAgent.findUnique({ where: { propertyId_agentId: { propertyId: agentPropertyId, agentId: agent.id } } });
  const createdHistory = await prisma.propertyHistory.findFirst({ where: { propertyId: agentPropertyId, action: "CREATED" } });
  assertOk("ثبت ملک توسط مشاور و ایجاد ارتباط مشاور", !!agentLink, `property=${agentPropertyId}`);
  assertOk("ثبت تاریخچه ایجاد ملک", !!createdHistory);

  const ownerReg = await registerProperty({
    ownerId: owner.id, propertyType: PropertyType.HOUSE, city: "شاهرود", district: "آزمایش", address: `ملک تست مالک ${suffix}`,
    latitudeExact: 36.4300, longitudeExact: 54.9700, postalCode: `WF${suffix}02`, area: 120, rooms: 3
  } as any);
  const ownerPropertyId = ownerReg.property.id;
  created.push(ownerPropertyId);
  const ownerLink = await prisma.propertyOwner.findFirst({ where: { propertyId: ownerPropertyId, ownerId: owner.id } });
  assertOk("ثبت ادعای مالکیت با وضعیت اولیه", !!ownerLink, `property=${ownerPropertyId}`);

  // 2. Listing, initial price, price change and history.
  await createPropertyListingWithInitialPrice(agentPropertyId, { transactionType: TransactionType.SALE, salePrice: "5000000000" });
  let listing = await prisma.propertyListing.findUnique({ where: { propertyId: agentPropertyId } });
  let priceHistory = await prisma.priceHistory.findMany({ where: { propertyId: agentPropertyId } });
  assertOk("ایجاد آگهی با قیمت اولیه", !!listing && priceHistory.some(p => p.changeType === "INITIAL"));
  await updatePropertyPrice(agentPropertyId, { transactionType: TransactionType.SALE, salePrice: "5500000000" });
  priceHistory = await prisma.priceHistory.findMany({ where: { propertyId: agentPropertyId } });
  const propertyHistoryAfterPrice = await prisma.propertyHistory.findMany({ where: { propertyId: agentPropertyId, action: "PRICE_CHANGED" } });
  assertOk("تغییر قیمت و ثبت تاریخچه قیمت", priceHistory.some(p => p.changeType === "PRICE_CHANGE") && propertyHistoryAfterPrice.length > 0);

  // 3. Valid lifecycle transitions and rejection of an invalid transition.
  await updatePropertyListingStatus(agentPropertyId, { status: ListingStatus.PENDING_OWNER_APPROVAL } as any);
  await updatePropertyListingStatus(agentPropertyId, { status: ListingStatus.PENDING_HASHTI_VERIFICATION } as any);
  await updatePropertyListingStatus(agentPropertyId, { status: ListingStatus.PUBLISHED } as any);
  listing = await prisma.propertyListing.findUnique({ where: { propertyId: agentPropertyId } });
  assertOk("چرخه وضعیت مجاز تا انتشار آگهی", listing?.status === ListingStatus.PUBLISHED && !!listing.publishedAt);
  let invalidTransitionRejected = false;
  try { await updatePropertyListingStatus(agentPropertyId, { status: ListingStatus.DRAFT } as any); } catch { invalidTransitionRejected = true; }
  assertOk("رد انتقال وضعیت نامعتبر از انتشار به پیش‌نویس", invalidTransitionRejected);

  // 4. Verification case review and linked history.
  const verificationCase = await createVerificationCaseService(agentPropertyId);
  const reviewedCase = await reviewVerificationCaseService({ verificationCaseId: verificationCase.id, status: VerificationStatus.VERIFIED, reviewedBy: staffUser.id, notes: "تست یکپارچه موقت" });
  const verificationHistory = await prisma.propertyHistory.findFirst({ where: { propertyId: agentPropertyId, action: "VERIFICATION_CHANGED" } });
  assertOk("ایجاد و تأیید پرونده ملک", reviewedCase.status === VerificationStatus.VERIFIED);
  assertOk("ثبت تاریخچه تأیید پرونده", !!verificationHistory);

  // 5. Duplicate matching: matching property within 1 km and same features should be a candidate.
  const candidate = await prisma.property.create({ data: {
    propertyType: PropertyType.APARTMENT, registrationSource: "HASHTI", city: "شاهرود", district: "آزمایش", address: `نامزد تکراری ${suffix}`,
    latitudeExact: 36.4245, longitudeExact: 54.9662, postalCode: `WF${suffix}01`, area: 100, rooms: 2, isActive: true
  } });
  created.push(candidate.id);
  const matches = await findDuplicateMatchesService(agentPropertyId);
  assertOk("یافتن ملک مشابه در شعاع ۱۰۰۰ متر", matches.some(m => m.property.id === candidate.id && m.similarityScore >= 0.8));

  // 6. Duplicate review and decision audit.
  const duplicateReview = await createDuplicateReviewService({ primaryPropertyId: agentPropertyId, candidatePropertyId: candidate.id });
  const duplicateDecision = await reviewDuplicateService({ duplicateReviewId: duplicateReview.id, decision: DuplicateDecision.DIFFERENT_PROPERTY, reviewedBy: staffUser.id, notes: "تست موقت" });
  assertOk("ثبت تصمیم نهایی بررسی ملک تکراری", duplicateDecision.decision === DuplicateDecision.DIFFERENT_PROPERTY);

  // 7. Favorite lifecycle on synthetic data, with persistence and cleanup.
  await addPropertyToFavoritesService(customer.id, agentPropertyId);
  const isFav = await isPropertyFavoriteService(customer.id, agentPropertyId);
  assertOk("افزودن و خواندن علاقه‌مندی", isFav === true);
  await removePropertyFromFavoritesService(customer.id, agentPropertyId);
  const isFavAfter = await isPropertyFavoriteService(customer.id, agentPropertyId);
  assertOk("حذف علاقه‌مندی و بازگشت وضعیت", isFavAfter === false);

  // 8. Archive and restore a separate owner property so listing tests stay intact.
  await archivePropertyService({ propertyId: ownerPropertyId, archivedReason: "تست یکپارچه موقت" });
  const archivedProperty = await prisma.property.findUnique({ where: { id: ownerPropertyId } });
  const archiveRow = await prisma.propertyArchive.findUnique({ where: { propertyId: ownerPropertyId } });
  assertOk("آرشیو ملک و غیرفعال‌شدن آن", archivedProperty?.isActive === false && !!archiveRow);
  await restorePropertyService(ownerPropertyId);
  const restoredProperty = await prisma.property.findUnique({ where: { id: ownerPropertyId } });
  const archiveAfterRestore = await prisma.propertyArchive.findUnique({ where: { propertyId: ownerPropertyId } });
  const restoreHistory = await prisma.propertyHistory.findFirst({ where: { propertyId: ownerPropertyId, action: "RESTORED" } });
  assertOk("بازگردانی ملک از آرشیو و ثبت تاریخچه", restoredProperty?.isActive === true && !archiveAfterRestore && !!restoreHistory);

  // 9. Basic referential integrity for synthetic actors.
  assertOk("ساخت پروفایل‌های نقش‌محور در دیتابیس تست", !!customer.id && !!owner.id && !!agent.id && !!staffUser.id);
  console.log(`\nWORKFLOW RESULT: ${passed} PASS | ${failed} FAIL`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => { console.error("\nWORKFLOW RUNNER ERROR:", err); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
'@

  Set-Content -Path $tempRunner -Value $runner -Encoding UTF8
  Write-Host 'اجرای گردش‌کارهای کسب‌وکار روی دیتابیس موقت...' -ForegroundColor Gray
  Invoke-TestRunner -DatabaseUrl $testUrl
  Write-Host 'تست گردش‌کارهای یکپارچه با موفقیت تمام شد.' -ForegroundColor Green
}
catch {
  Write-Host "خطا: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
finally {
  if (Test-Path $tempRunner) { Remove-Item $tempRunner -Force -ErrorAction SilentlyContinue }
  if ($createdDb -and $testDb) {
    Write-Host "حذف دیتابیس موقت $testDb ..." -ForegroundColor Gray
    & docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $testDb WITH (FORCE);" 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host 'دیتابیس موقت حذف شد؛ دیتابیس اصلی تغییری نکرد.' -ForegroundColor Green }
    else { Write-Host "هشدار: دیتابیس موقت حذف نشد: $testDb — در صورت نیاز آن را دستی حذف کن." -ForegroundColor Yellow }
  }
}
