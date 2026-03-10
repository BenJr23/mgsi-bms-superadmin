CREATE TABLE "walk_in_customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "walk_in_customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "walk_in_customers_email_key" ON "walk_in_customers"("email");

ALTER TABLE "bookings"
ADD COLUMN "walkInCustomerId" TEXT;

ALTER TABLE "bookings"
DROP COLUMN IF EXISTS "walkInCompanyName";

CREATE INDEX "bookings_walkInCustomerId_idx" ON "bookings"("walkInCustomerId");

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_walkInCustomerId_fkey"
FOREIGN KEY ("walkInCustomerId") REFERENCES "walk_in_customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
