import {
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  InteractionContextType,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
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
    .setDescription("Configure the bot")
    .setContexts(InteractionContextType.Guild),
  // .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild)
      throw new Error("The command was not executed in a guild");

    const {
      isConfigured: isAlreadyConfigured,
      packwizUrl: currentPackwizUrl,
      channel: currentChannel,
    } = await isGuildAlreadyConfigured(interaction.guild.id);

    const modal = new ModalBuilder().setCustomId("setup").setTitle("Setup");

    if (isAlreadyConfigured) {
      modal.addTextDisplayComponents(buildAlreadyConfiguredTextDisplay());
    }

    modal.addLabelComponents(
      buildPackwizUrlInputLabel(
        isAlreadyConfigured ? currentPackwizUrl : undefined,
      ),
      buildGithubAccessTokenInputLabel(),
      buildChannelInputLabel(isAlreadyConfigured ? currentChannel : undefined),
    );

    await interaction.showModal(modal);
  },
} satisfies Command;

async function isGuildAlreadyConfigured(guildId: string): Promise<{
  isConfigured: boolean;
  packwizUrl: string | undefined;
  channel: string | undefined;
}> {
  const serverFromDb = (
    await db
      .select({ packwizUrl: modpack.url, channel: server.pollChannel })
      .from(server)
      .where(eq(server.serverId, guildId))
      .innerJoin(modpack, eq(server.serverId, modpack.serverId))
      .limit(1)
  )[0];

  return {
    isConfigured: !!serverFromDb,
    packwizUrl: serverFromDb?.packwizUrl,
    channel: serverFromDb?.channel,
  };
}

function buildAlreadyConfiguredTextDisplay() {
  return new TextDisplayBuilder().setContent(
    "**⚠️ This server is already configured!**\nThe current config will be overwritten, if you submit the setup again.",
  );
}

function buildPackwizUrlInputLabel(currentValue: string | undefined) {
  const packUrlInput = new TextInputBuilder()
    .setCustomId("packwizURL")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("https://github.com/")
    .setRequired(true);

  if (currentValue) {
    packUrlInput.setValue(currentValue);
  }

  const packUrlLabel = new LabelBuilder()
    .setLabel("Packwiz URL")
    .setDescription(
      "The URL of the git repository that is hosting the packwiz modpack (must have pack.toml at the root).",
    )
    .setTextInputComponent(packUrlInput);

  return packUrlLabel;
}

function buildGithubAccessTokenInputLabel() {
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

  return githubAccessTokenLabel;
}

function buildChannelInputLabel(currentValue: string | undefined) {
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("channel")
    .setPlaceholder("Select a channel")
    .setRequired(true)
    .setChannelTypes(ChannelType.GuildText);

  if (currentValue) {
    channelSelect.setDefaultChannels(currentValue);
  }

  const channelLabel = new LabelBuilder()
    .setLabel("Channel")
    .setDescription("The channel to send polls to.")
    .setChannelSelectMenuComponent(channelSelect);

  return channelLabel;
}
