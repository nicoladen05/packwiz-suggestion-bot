import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../client";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Pings the bot"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply({ flags: MessageFlags.Ephemeral });
  },
} satisfies Command;
