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
import { sendPoll } from "../../utils/send-poll";

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
  if (!interaction.channel) return;

  const searchQuery = interaction.options.get("search-query", true)
    .value as string;

  const searchResults = await searchModrinthProjects(searchQuery);
  const selectedProject =
    searchResults.length > 1
      ? await sendSelectionMenu(interaction, searchResults)
      : searchResults[0];

  if (!selectedProject) return;

  await sendPoll(interaction.channel.id, interaction.user, selectedProject);

  await interaction.editReply("✅ Suggestion submitted!");
}

async function sendSelectionMenu(
  interaction: ChatInputCommandInteraction,
  searchResults: ModrinthProject[],
): Promise<ModrinthProject | undefined> {
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    buildSelectionMenu(searchResults),
  );

  const message = await interaction.editReply({
    content: "Choose the correct mod",
    components: [row],
  });

  try {
    const selection = (await message.awaitMessageComponent({
      time: 600_000,
      filter: (responder) => responder.user.id === interaction.user.id,
    })) as StringSelectMenuInteraction;

    await selection.deferUpdate();

    return (
      searchResults.find(
        (project) => project.project_id === selection.values[0],
      ) ?? undefined
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
          .setDescription(project.description?.substring(0, 100) ?? "N/A")
          .setValue(project.project_id),
      ),
    );
}
