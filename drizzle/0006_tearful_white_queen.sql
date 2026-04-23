CREATE TABLE `forma_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefingId` int NOT NULL,
	`type` varchar(10) NOT NULL DEFAULT 'file',
	`name` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500),
	`mimeType` varchar(100),
	`size` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forma_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forma_attachments` ADD CONSTRAINT `forma_attachments_briefingId_forma_briefings_id_fk` FOREIGN KEY (`briefingId`) REFERENCES `forma_briefings`(`id`) ON DELETE no action ON UPDATE no action;