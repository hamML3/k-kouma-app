-- CreateIndex
CREATE INDEX `appointments_therapist_id_scheduled_at_idx` ON `appointments`(`therapist_id`, `scheduled_at`);
