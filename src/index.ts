import { Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { Client } from "./client";
import { loadCommands } from "./load-commands";
import { PackwizModpack } from "./lib/packwiz-modpack";

const commands = await loadCommands();

export const client = new Client(
  { intents: [GatewayIntentBits.Guilds] },
  commands,
);
client.once(Events.ClientReady, (client) => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command found for ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an internal error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an internal error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

const token = process.env.TOKEN;
const packwizRepository = process.env.PACKWIZ_REPOSITORY;

if (!token || !packwizRepository) {
  throw new Error(
    "TOKEN and PACKWIZ_REPOSITORY environment variables are required",
  );
}

export const modpack = new PackwizModpack(
  packwizRepository,
  process.env.REPOSITORY_PATH ?? "./repo/",
  process.env.WORKTREE_PATH ?? "/tmp/packwiz-suggestion-bot-worktrees",
);

client.login(token);
