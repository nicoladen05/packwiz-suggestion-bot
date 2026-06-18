import { ModrinthProject } from "../../lib/modrinth";
import { client } from "../..";
import { EmbedBuilder, PollData, TextChannel, User } from "discord.js";
import { db } from "../../db";
import { activePoll } from "../../db/schema";

/**
 * Sends a poll to the specified channel, to propose adding a project to the modpack.
 * @param channelId The ID of the channel to send the poll to.
 * @param submitter The user who submitted the project suggestion.
 * @param project The project to add to the modpack.
 * @returns
 */
export async function sendPoll(
  channelId: string,
  submitter: User,
  project: ModrinthProject,
): Promise<void> {
  const channel = client.channels.cache.get(channelId);
  if (!channel || !(channel instanceof TextChannel)) return;

  const modEmbed = buildModEmbed(project);

  const poll: PollData = {
    question: {
      text: `${submitter.displayName} möchte ${project.title} zum Modpack hinzufügen.`,
    },
    answers: [
      { text: "Ja, hinzufügen", emoji: "\u{1F44D}" }, // 👍
      { text: "Nein, nicht hinzufügen", emoji: "\u{1F44E}" }, // 👎
    ],
    duration: 1,
    allowMultiselect: false,
  };

  await channel.send({ embeds: [modEmbed] });
  const message = await channel.send({ poll });

  await db.insert(activePoll).values({
    messageId: message.id,
    finishesAt: message.poll!.expiresAt!.toISOString(),
    projectId: project.project_id,
  });

  // EVERYTHING BELOW THIS IS FOR DEBUGGING
  await new Promise((resolve) => setTimeout(resolve, 10000));

  await message.poll?.end();
}

function buildModEmbed(project: ModrinthProject): EmbedBuilder {
  const modEmbed = new EmbedBuilder()
    .setTitle(project.title ?? "Untitled Mod")
    .setDescription(project.description ?? "")
    .setColor(project.color ?? "Random")
    .setURL(
      `https://modrinth.com/${project.project_type}/${project.slug ?? project.project_id}`,
    )
    .addFields(
      {
        name: "Version",
        value:
          project.versions.length <= 5
            ? project.versions.toReversed().join(", ")
            : project.versions.toReversed().slice(0, 5).join(", ") + ", ...",
        inline: true,
      },
      {
        name: "Modloader",
        value:
          project.categories
            ?.filter((category) =>
              ["fabric", "neoforge", "forge"].includes(category),
            )
            .join(", ") ?? "N/A",
        inline: true,
      },
    );

  if (project.icon_url) modEmbed.setThumbnail(project.icon_url);

  if (project.featured_gallery) modEmbed.setImage(project.featured_gallery);
  else if (project.gallery && project.gallery.length > 0)
    modEmbed.setImage(project.gallery[0]);

  return modEmbed;
}
