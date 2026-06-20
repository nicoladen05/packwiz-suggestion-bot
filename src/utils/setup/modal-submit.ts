import { MessageFlags, ModalSubmitInteraction } from "discord.js";
import { db } from "../../db";
import { modpack, server } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function handleSetupModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  if (!interaction.guild) return;

  const alreadyConfigured = (
    await db
      .select({ serverId: server.serverId })
      .from(server)
      .where(eq(server.serverId, interaction.guild.id))
      .limit(1)
  )[0];

  const serverId = interaction.guild.id;
  const selectedChannel = interaction.fields
    .getSelectedChannels("channel", true)
    .first()?.id;

  if (!selectedChannel) return;

  const packwizUrl = interaction.fields.getTextInputValue("packwizURL").trim();
  const accessToken = interaction.fields
    .getTextInputValue("githubAccessToken")
    .trim();

  if (!alreadyConfigured) {
    await Promise.all([
      db.insert(server).values({
        serverId: serverId,
        pollChannel: selectedChannel,
      }),
      db.insert(modpack).values({
        serverId: serverId,
        url: packwizUrl,
        accessToken,
      }),
    ]);
  } else {
    await Promise.all([
      db
        .update(server)
        .set({ pollChannel: selectedChannel })
        .where(eq(server.serverId, serverId)),
      db
        .update(modpack)
        .set({ url: packwizUrl, accessToken })
        .where(eq(modpack.serverId, serverId)),
    ]);
  }

  await interaction.reply({
    content: "✅ Setup complete",
    flags: MessageFlags.Ephemeral,
  });
}
