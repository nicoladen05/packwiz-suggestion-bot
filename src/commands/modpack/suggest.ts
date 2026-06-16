import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../client";
import { modpack } from "../..";

export default {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Suggest a mod to add to the modpack")
    .addStringOption((option) =>
      option
        .setName("modrinth-slug")
        .setDescription("The slug of the mod on modrinth")
        .setRequired(true),
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    interaction.deferReply();

    await modpack.addModrinthMod(
      interaction.options.getString("modrinth-slug", true),
    );

    interaction.editReply("Mod suggestion accepted");
  },
} satisfies Command;
