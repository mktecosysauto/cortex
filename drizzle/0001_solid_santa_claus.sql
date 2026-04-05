CREATE TABLE `cortex_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`durationMin` int NOT NULL,
	`status` enum('completed','abandoned','paused') NOT NULL,
	`taskName` varchar(256),
	`toolActive` varchar(64),
	`xpEarned` int NOT NULL DEFAULT 0,
	`glifosEarned` int NOT NULL DEFAULT 0,
	`wasFocused` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cortex_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cortex_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`difficulty` enum('facil','media','dificil','lendaria') NOT NULL,
	`status` enum('pending','done') NOT NULL DEFAULT 'pending',
	`toolContext` varchar(64),
	`xpEarned` int NOT NULL DEFAULT 0,
	`glifosEarned` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `cortex_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cortex_tool_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tool` varchar(64) NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`xpEarned` int NOT NULL DEFAULT 0,
	`glifosEarned` int NOT NULL DEFAULT 0,
	`wasFocused` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cortex_tool_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cortex_weekly_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`insightText` text,
	`statsSnapshot` json,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cortex_weekly_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `agentName` varchar(64) DEFAULT 'AGENTE';--> statement-breakpoint
ALTER TABLE `users` ADD `agentAppearance` json DEFAULT ('{"paletteId":null,"silhouetteId":null,"effectId":null,"titleId":null}');--> statement-breakpoint
ALTER TABLE `users` ADD `xp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `glifos` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `rankId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `purchases` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `users` ADD `showInRanking` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sprintGoalHours` int;--> statement-breakpoint
ALTER TABLE `users` ADD `sprintStartDate` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `goalDailyMin` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `goalWeeklyMin` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cortex_sessions` ADD CONSTRAINT `cortex_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cortex_tasks` ADD CONSTRAINT `cortex_tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cortex_tool_events` ADD CONSTRAINT `cortex_tool_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cortex_weekly_insights` ADD CONSTRAINT `cortex_weekly_insights_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;