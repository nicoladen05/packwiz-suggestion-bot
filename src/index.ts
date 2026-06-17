import { Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { Client } from "./client";
import { loadCommands } from "./load-commands";
import { handleSetupModalSubmit } from "./commands/admin/setup";
import { startup } from "./utils/startup";

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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === "setup")
    await handleSetupModalSubmit(interaction);
});

const token = process.env.TOKEN;
if (!token) throw new Error("TOKEN environment variable is not set");

startup();
client.login(token);
