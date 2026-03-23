CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`endpoint` text,
	`method` text,
	`status` integer,
	`duration_ms` real,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`roles` text DEFAULT '["user"]' NOT NULL,
	`active_services` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_subject_unique` ON `users` (`subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);