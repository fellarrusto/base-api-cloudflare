ALTER TABLE `audit_logs` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `metadata` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX `audit_logs_timestamp_idx` ON `audit_logs` (`timestamp`);