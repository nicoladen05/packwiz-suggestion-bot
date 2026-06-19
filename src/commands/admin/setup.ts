import {
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { Command } from "../../client";
import { db } from "../../db";
import { modpack, server } from "../../db/schema";
import { eq } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure the bot"),
  // .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const modal = new ModalBuilder().setCustomId("setup").setTitle("Setup");

    if (!interaction.guild) return;

    // Already configured warning
    const serverFromDb = (
      await db
        .select({ packwizUrl: modpack.url, channel: server.pollChannel })
        .from(server)
        .where(eq(server.serverId, interaction.guild.id))
        .innerJoin(modpack, eq(server.serverId, modpack.serverId))
        .limit(1)
    )[0];

    if (serverFromDb) {
      const alreadyConfiguredLabel = new TextDisplayBuilder().setContent(
        "**⚠️ This server is already configured!**\nThe current config will be overwritten, if you submit the setup again.",
      );

      modal.addTextDisplayComponents(alreadyConfiguredLabel);
    }

    // Packwiz URL input
    const packUrlInput = new TextInputBuilder()
      .setCustomId("packwizURL")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("https://github.com/")
      .setRequired(true);

    if (serverFromDb) {
      packUrlInput.setValue(serverFromDb.packwizUrl);
    }

    const packUrlLabel = new LabelBuilder()
      .setLabel("Packwiz URL")
      .setDescription(
        "The URL of the git repository that is hosting the packwiz modpack (must have pack.toml at the root).",
      )
      .setTextInputComponent(packUrlInput);

    modal.addLabelComponents(packUrlLabel);

    // GitHub access token input
    const githubAccessTokenInput = new TextInputBuilder()
      .setCustomId("githubAccessToken")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("github_pat_...")
      .setRequired(true);

    const githubAccessTokenLabel = new LabelBuilder()
      .setLabel("GitHub access token")
      .setDescription(
        "A personal access token with write access to the modpack repository.",
      )
      .setTextInputComponent(githubAccessTokenInput);

    modal.addLabelComponents(githubAccessTokenLabel);

    // Channel input
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId("channel")
      .setPlaceholder("Select a channel")
      .setRequired(true)
      .setChannelTypes(ChannelType.GuildText);

    if (serverFromDb) {
      channelSelect.setDefaultChannels(serverFromDb.channel);
    }

    const channelLabel = new LabelBuilder()
      .setLabel("Channel")
      .setDescription("The channel to send polls to.")
      .setChannelSelectMenuComponent(channelSelect);

    modal.addLabelComponents(channelLabel);

    await interaction.showModal(modal);
  },
} satisfies Command;

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
