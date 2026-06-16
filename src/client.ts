import {
  ChatInputCommandInteraction,
  ClientOptions,
  Collection,
  Client as DefaultClient,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export type Command = {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export class Client extends DefaultClient {
  commands: Collection<string, Command>;

  constructor(options: ClientOptions, commands: Collection<string, any>) {
    super(options);

    this.commands = commands;
  }
}
