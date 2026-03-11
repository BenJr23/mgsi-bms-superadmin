-- Add representative linkage on companies
ALTER TABLE "companies"
ADD COLUMN "representativeId" TEXT;

-- Ensure representative points to an existing user
ALTER TABLE "companies"
ADD CONSTRAINT "companies_representativeId_fkey"
FOREIGN KEY ("representativeId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "companies_representativeId_idx" ON "companies"("representativeId");
