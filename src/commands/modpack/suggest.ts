import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { Command } from "../../client";
import { ModrinthProject, searchModrinthProjects } from "../../lib/modrinth";

export default {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Suggest a mod to add to the modpack")
    .addStringOption((option) =>
      option
        .setName("search-query")
        .setDescription("The search query to use for finding a mod")
        .setRequired(true),
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await processSubmission(interaction);
  },
} satisfies Command;

async function processSubmission(interaction: ChatInputCommandInteraction) {
  const searchQuery = interaction.options.get("search-query", true)
    .value as string;

  const searchResults = await searchModrinthProjects(searchQuery);
  const selectedProject =
    searchResults.length > 1
      ? await sendSelectionMenu(interaction, searchResults)
      : searchResults[0];

  if (!selectedProject) return;
}

async function sendSelectionMenu(
  interaction: ChatInputCommandInteraction,
  searchResults: ModrinthProject[],
): Promise<ModrinthProject | undefined> {
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    buildSelectionMenu(searchResults),
  );

  const response = await interaction.reply({
    content: "Choose the correct mod",
    components: [row],
    flags: MessageFlags.Ephemeral,
    withResponse: true,
  });

  try {
    const selection = (await response.resource?.message?.awaitMessageComponent({
      time: 60_000,
      filter: (responder) => responder.user.id === interaction.user.id,
    })) as StringSelectMenuInteraction;

    return (
      searchResults.find((project) => project.title === selection.values[0]) ??
      undefined
    );
  } catch {
    await interaction.editReply({
      content: "No selection received within 10 minutes, cancelling",
    });
    return undefined;
  }
}

function buildSelectionMenu(
  projects: ModrinthProject[],
): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId("project-select")
    .setPlaceholder("Select a project")
    .addOptions(
      ...projects.map((project) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(project.title ?? "Unknown Mod")
          .setValue(project.project_id),
      ),
    );
}
