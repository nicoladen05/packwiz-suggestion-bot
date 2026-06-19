import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const server = sqliteTable("server", {
  serverId: text().primaryKey(),
  pollChannel: text().notNull(),
});

export const modpack = sqliteTable("modpack", {
  serverId: text()
    .primaryKey()
    .references(() => server.serverId),
  url: text().notNull(),
  accessToken: text().notNull(),
});

export const activePoll = sqliteTable("active_poll", {
  messageId: text().primaryKey(),
  finishesAt: text().notNull(),
  projectId: text().notNull(),
});
