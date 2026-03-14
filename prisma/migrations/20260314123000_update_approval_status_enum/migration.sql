-- Rename enum values for booking approval status.
-- PENDING -> RESCHEDULED
-- APPROVED -> CONFIRMED
ALTER TYPE "ApprovalStatus" RENAME TO "ApprovalStatus_old";

CREATE TYPE "ApprovalStatus" AS ENUM ('RESCHEDULED', 'CONFIRMED');

ALTER TABLE "bookings"
ALTER COLUMN "approvalStatus" TYPE "ApprovalStatus"
USING (
  CASE
    WHEN "approvalStatus"::text = 'PENDING' THEN 'RESCHEDULED'
    WHEN "approvalStatus"::text = 'APPROVED' THEN 'CONFIRMED'
    ELSE 'RESCHEDULED'
  END
)::"ApprovalStatus";

DROP TYPE "ApprovalStatus_old";
