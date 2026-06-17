import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../client";

const MODRINTH_DOWNLOAD = "https://modrinth.com/app";
const MODRINTH_TUTORIAL = "https://www.youtube.com/watch?v=EXAMPLE_MODRINTH";
const PRISM_DOWNLOAD = "https://prismlauncher.org/download";
const PRISM_TUTORIAL = "https://www.youtube.com/watch?v=EXAMPLE_PRISM";

const PRE_LAUNCH_HOOK = `#!/bin/bash
cd "$INST_DIR" || exit 1
git pull origin main
packwiz update`;

const JAVA_START_TAGS = `-Xmx4G -Xms2G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=50 -XX:G1MaxNewSizePercent=80 -XX:G1HeapRegionSize=32M`;

export default {
  data: new SlashCommandBuilder()
    .setName("download")
    .setDescription("Full tutorial on how to install and setup everything."),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.channel) return;

    const { channel, user } = interaction;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("modrinth")
        .setLabel("Modrinth")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("prism")
        .setLabel("Prism Launcher")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("own-launcher")
        .setLabel("Eigener Launcher")
        .setStyle(ButtonStyle.Secondary),
    );

    const response = await interaction.reply({
      content: "### Wähle deinen Launcher aus\nWelchen Launcher verwendest du?",
      components: [row],
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    try {
      if (!response.resource?.message) return;

      const choice = await response.resource.message.awaitMessageComponent({
        filter: (i) => i.customId === "modrinth" || i.customId === "prism" || i.customId === "own-launcher",
        componentType: ComponentType.Button,
        time: 120_000,
      });

      switch (choice.customId) {
        case "modrinth":
          await handleLauncher(choice, "Modrinth", MODRINTH_DOWNLOAD, MODRINTH_TUTORIAL);
          break;
        case "prism":
          await handleLauncher(choice, "Prism Launcher", PRISM_DOWNLOAD, PRISM_TUTORIAL);
          break;
        case "own-launcher":
          await handleOwnLauncher(choice);
          break;
      }
    } catch {
      // Timeout
    }
  },
} satisfies Command;

async function handleLauncher(
  interaction: ButtonInteraction,
  launcherName: string,
  downloadUrl: string,
  tutorialUrl: string,
) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Download")
      .setStyle(ButtonStyle.Link)
      .setURL(downloadUrl),
    new ButtonBuilder()
      .setLabel("YouTube Tutorial")
      .setStyle(ButtonStyle.Link)
      .setURL(tutorialUrl),
    new ButtonBuilder()
      .setCustomId("done")
      .setLabel("Fertig")
      .setStyle(ButtonStyle.Success),
  );

  await interaction.update({
    content: `### ${launcherName}\nLade den Launcher herunter und installiere Minecraft. Folge dem Tutorial falls nötig.`,
    components: [row],
  });

  try {
    const done = await interaction.channel!.awaitMessageComponent({
      filter: (i) => i.customId === "done",
      componentType: ComponentType.Button,
      time: 600_000,
    });

    await showPreLaunchHook(done, launcherName);
  } catch {
    // Timeout
  }
}

async function showPreLaunchHook(
  interaction: ButtonInteraction,
  launcherName: string,
) {
  const isModrinth = launcherName === "Modrinth";

  const embed = new EmbedBuilder()
    .setTitle("Pre-Launch Hook einrichten")
    .setDescription(
      [
        `So richtest du den Pre-Launch Hook in **${launcherName}** ein:`,
        "",
        "**1. Neue Instanz erstellen**",
        "Öffne den Launcher und erstelle eine neue Minecraft-Instanz.",
        "",
        "**2. Einstellungen öffnen**",
        "Gehe zu den Instanz-Einstellungen.",
        "",
        "**3. Pre-Launch Hook konfigurieren**",
        isModrinth
          ? 'Gehe zu "Einstellungen" → "Pre-Launch Hook" und füge den Befehl ein.'
          : 'Gehe zu "Einstellungen" → "Custom Commands" → "Pre-Launch Command" und füge den Befehl ein.',
        "",
        "**4. Speichern & Starten**",
        "Speichere die Einstellungen und starte die Instanz. Der Hook wird automatisch ausgeführt.",
      ].join("\n"),
    )
    .setColor(0x00ff00);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("copy-hook")
      .setLabel("📋 Pre-Launch Hook kopieren")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    content: `### ✅ Pre-Launch Hook – ${launcherName}`,
    embeds: [embed],
    components: [row],
  });

  try {
    const copy = await interaction.channel!.awaitMessageComponent({
      filter: (i) => i.customId === "copy-hook",
      componentType: ComponentType.Button,
      time: 600_000,
    });

    await copy.update({
      content: `### ✅ Pre-Launch Hook – ${launcherName}\n\n**Pre-Launch Hook Befehl:**\n\`\`\`bash\n${PRE_LAUNCH_HOOK}\n\`\`\``,
      embeds: [],
      components: [buildFertigRow()],
    });

    await waitForFertig(copy);
  } catch {
    // Timeout
  }
}

async function handleOwnLauncher(
  interaction: ButtonInteraction,
) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("copy-hook-own")
      .setLabel("📋 Pre-Launch Hook kopieren")
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.update({
    content:
      "### Eigener Launcher\n"
      + "Füge den Pre-Launch Hook manuell in deinem Launcher ein. "
      + "Die genaue Vorgehensweise hängt von deinem Launcher ab.\n\n"
      + "**Wichtig:** Der Hook muss **vor** dem Start von Minecraft ausgeführt werden.\n"
      + "Suche in den Einstellungen deines Launchers nach \"Pre-Launch Hook\", "
      + "\"Pre-Launch Command\" oder \"Custom Commands\".",
    components: [row],
  });

  try {
    const copy = await interaction.channel!.awaitMessageComponent({
      filter: (i) => i.customId === "copy-hook-own",
      componentType: ComponentType.Button,
      time: 300_000,
    });

    await copy.update({
      content:
        "### Eigener Launcher\n\n"
        + "**Pre-Launch Hook Befehl:**\n"
        + `\`\`\`bash\n${PRE_LAUNCH_HOOK}\n\`\`\`\n\n`
        + "### ☕ Java Start Tags\n"
        + "Füge diese JVM-Argumente in den Java-Einstellungen deines Launchers hinzu.\n\n"
        + "**Wo finden?**\n"
        + "- **Prism Launcher:** Einstellungen → Java → Java Arguments\n"
        + "- **Modrinth:** Einstellungen → Java → JVM Arguments\n"
        + "- **MultiMC:** Einstellungen → Java → JVM Arguments\n"
        + "- **ATLauncher:** Settings → Java → Extra JVM Arguments\n\n"
        + "**Tags:**\n"
        + `\`\`\`bash\n${JAVA_START_TAGS}\n\`\`\``,
      components: [buildFertigRow()],
    });

    await waitForFertig(copy);
  } catch {
    // Timeout
  }
}

function buildFertigRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("fertig")
      .setLabel("Fertig")
      .setStyle(ButtonStyle.Success),
  );
}

async function waitForFertig(interaction: ButtonInteraction) {
  const fertig = await interaction.channel!.awaitMessageComponent({
    filter: (i) => i.customId === "fertig",
    componentType: ComponentType.Button,
    time: 300_000,
  });

  await fertig.deferUpdate();
  await fertig.message.delete();
}
