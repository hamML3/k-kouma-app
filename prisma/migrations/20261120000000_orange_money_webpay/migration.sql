-- API Orange Money Web Payment : identifiants de la transaction chez Orange.
ALTER TABLE `payments`
    ADD COLUMN `provider_order_id` VARCHAR(30) NULL,
    ADD COLUMN `notif_token` VARCHAR(64) NULL,
    ADD COLUMN `provider_txn_id` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `payments_provider_order_id_key` ON `payments`(`provider_order_id`);
CREATE UNIQUE INDEX `payments_notif_token_key` ON `payments`(`notif_token`);
