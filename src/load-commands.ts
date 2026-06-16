import { Collection } from "discord.js";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Command } from "./client";

function isCommand(value: unknown): value is Command {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "execute" in value &&
    typeof value.execute === "function"
  );
}

export async function loadCommands(): Promise<Collection<string, Command>> {
  const commandsCollection = new Collection<string, Command>();

  const commandsFolderPath = path.join(__dirname, "commands");
  const commandsFolder = await readdir(commandsFolderPath, {
    recursive: true,
  });

  await Promise.all(
    commandsFolder
      .filter((file) => file.endsWith(".ts"))
      .map(async (file) => {
        const absoluteFilePath = path.join(commandsFolderPath, file);

        const command = (await import(absoluteFilePath)).default;

        if (isCommand(command)) {
          commandsCollection.set(command.data.name, command);
        } else {
          console.warn(`The command at ${file} is not a valid command.`);
        }
      }),
  );

  return commandsCollection;
}
