CREATE TABLE `arquivo_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`coverUrl` text,
	`isSystem` boolean NOT NULL DEFAULT false,
	`promptCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `arquivo_collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `arquivo_prompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`tags` json NOT NULL DEFAULT ('[]'),
	`prompt` text NOT NULL,
	`imgUrl` text,
	`isSystem` boolean NOT NULL DEFAULT false,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `arquivo_prompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `arquivo_collections` ADD CONSTRAINT `arquivo_collections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `arquivo_prompts` ADD CONSTRAINT `arquivo_prompts_collectionId_arquivo_collections_id_fk` FOREIGN KEY (`collectionId`) REFERENCES `arquivo_collections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `arquivo_prompts` ADD CONSTRAINT `arquivo_prompts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;