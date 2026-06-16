import { REST, Routes } from "discord.js";
import { loadCommands } from "./load-commands";

const commands = await loadCommands();
const commandsJSON = [];

for (const [_, command] of commands) {
  commandsJSON.push(command.data.toJSON());
}

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
if (!token || !clientId) {
  throw new Error("TOKEN and CLIENT_ID environment variables not set");
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(
      `Started refreshing ${commandsJSON.length} application (/) commands.`,
    );

    let data;

    if (clientId && guildId) {
      console.log(
        `Refreshing commands for client ${clientId} in guild ${guildId}.`,
      );

      // The put method is used to fully refresh all commands in the guild with the current set
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsJSON },
      );
    } else {
      data = await rest.put(Routes.applicationCommands(clientId), {
        body: commandsJSON,
      });
    }

    console.log(
      `Successfully reloaded ${Array.isArray(data) ? data.length : 0} application (/) commands.`,
    );
  } catch (error) {
    console.error(error);
  }
})();
