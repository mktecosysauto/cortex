CREATE TABLE `verso_brand_voice` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brandName` varchar(100) NOT NULL DEFAULT '',
	`brandDesc` text,
	`toneKeywords` json,
	`toneAvoid` json,
	`exampleText` text,
	`persona` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verso_brand_voice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verso_texts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL DEFAULT 'Sem título',
	`category` varchar(64) NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`toneSnapshot` json,
	`inputFields` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verso_texts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cortex_tasks` DROP FOREIGN KEY `cortex_tasks_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `cortex_tasks` MODIFY COLUMN `title` text NOT NULL;--> statement-breakpoint
ALTER TABLE `cortex_tasks` MODIFY COLUMN `difficulty` enum('facil','media','dificil','lendaria') NOT NULL DEFAULT 'facil';--> statement-breakpoint
ALTER TABLE `cortex_tasks` MODIFY COLUMN `status` enum('pending','done','archived') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `cortex_tasks` ADD `originalDeadline` date;--> statement-breakpoint
ALTER TABLE `cortex_tasks` ADD `currentDeadline` date;--> statement-breakpoint
ALTER TABLE `cortex_tasks` ADD `deadlineChanged` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cortex_tasks` ADD `bonusEligible` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `cortex_tasks` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `cortex_tasks` ADD `displayOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `verso_brand_voice` ADD CONSTRAINT `verso_brand_voice_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verso_texts` ADD CONSTRAINT `verso_texts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;