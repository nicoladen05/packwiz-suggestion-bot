CREATE TABLE `active_poll` (
	`messageId` text PRIMARY KEY NOT NULL,
	`finishesAt` text NOT NULL,
	`projectId` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modpack` (
	`serverId` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`accessToken` text NOT NULL,
	FOREIGN KEY (`serverId`) REFERENCES `server`(`serverId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `server` (
	`serverId` text PRIMARY KEY NOT NULL,
	`pollChannel` text NOT NULL
);
