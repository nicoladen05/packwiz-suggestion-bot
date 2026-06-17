import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
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

  if (searchResults.length > 1) {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      buildSelectionMenu(searchResults),
    );

    await interaction.followUp({
      content: "Choose the correct mod",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
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
