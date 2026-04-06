CREATE TABLE `forma_briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`projectType` varchar(64) NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`clientEmail` varchar(200) NOT NULL,
	`publicToken` varchar(64) NOT NULL,
	`brandLogoUrl` text,
	`brandColorPrimary` varchar(16) NOT NULL DEFAULT '#000000',
	`brandColorSecondary` varchar(16) NOT NULL DEFAULT '#ffffff',
	`brandNameDisplay` varchar(200),
	`openingMessage` text,
	`closingMessage` text,
	`questionIds` json NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`aiSummary` text,
	`aiConcept` text,
	`aiNextSteps` text,
	`aiGeneratedAt` timestamp,
	`sentAt` timestamp,
	`answeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forma_briefings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forma_followups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefingId` int NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`answeredAt` timestamp,
	CONSTRAINT `forma_followups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forma_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefingId` int NOT NULL,
	`questionId` varchar(64) NOT NULL,
	`questionText` text NOT NULL,
	`answer` text NOT NULL,
	`isFollowup` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forma_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forma_briefings` ADD CONSTRAINT `forma_briefings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forma_followups` ADD CONSTRAINT `forma_followups_briefingId_forma_briefings_id_fk` FOREIGN KEY (`briefingId`) REFERENCES `forma_briefings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forma_responses` ADD CONSTRAINT `forma_responses_briefingId_forma_briefings_id_fk` FOREIGN KEY (`briefingId`) REFERENCES `forma_briefings`(`id`) ON DELETE no action ON UPDATE no action;