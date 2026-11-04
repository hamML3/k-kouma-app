-- AlterTable
ALTER TABLE `therapist_earnings`
  ADD COLUMN `paid_out` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `paid_out_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `therapist_earnings_therapist_id_paid_out_idx` ON `therapist_earnings`(`therapist_id`, `paid_out`);
