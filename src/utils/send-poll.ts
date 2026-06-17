import { eq } from "drizzle-orm";
import { db } from "../db";
import { server } from "../db/schema";
import { ModrinthProject } from "../lib/modrinth";
import { client } from "..";
import { TextChannel } from "discord.js";

export async function sendPoll(
  channelId: string,
  project: ModrinthProject,
): Promise<void> {
  const channel = client.channels.cache.get(channelId);
  if (!channel || !(channel instanceof TextChannel)) return;

  channel.send();
}
