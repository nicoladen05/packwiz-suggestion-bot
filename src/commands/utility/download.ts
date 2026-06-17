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
        filter: (i) =>
          i.customId === "modrinth" ||
          i.customId === "prism" ||
          i.customId === "own-launcher",
        componentType: ComponentType.Button,
        time: 120_000,
      });

      switch (choice.customId) {
        case "modrinth":
          await handleLauncher(
            choice,
            "Modrinth",
            MODRINTH_DOWNLOAD,
            MODRINTH_TUTORIAL,
          );
          break;
        case "prism":
          await handleLauncher(
            choice,
            "Prism Launcher",
            PRISM_DOWNLOAD,
            PRISM_TUTORIAL,
          );
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

    console.log("WHHHYYYYYYYY;-;");
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
  const folder = isModrinth ? "modrinth" : "prism";

  const steps = [
    {
      title: "Schritt 1: Mrpack herunterladen",
      desc: "Lade das beigefügte `.mrpack` herunter.",
    },
    {
      title: "Schritt 2: Neue Instanz erstellen",
      desc: "Öffne den Launcher und erstelle eine neue Instanz.\nWähle die gewünschte Minecraft-Version.",
    },
    {
      title: "Schritt 3: Mrpack importieren",
      desc: "Klicke auf `Import` und wähle die heruntergeladene `.mrpack`-Datei aus.\nDie Modifikationen werden automatisch übernommen.",
    },
    {
      title: "Schritt 4: Instanz-Einstellungen öffnen",
      desc: isModrinth
        ? "Klicke auf die drei Punkte (`⋯`) → `Einstellungen`."
        : "Rechtsklick auf die Instanz → `Einstellungen`.",
    },
    {
      title: "Schritt 5: Einstellungen navigieren",
      desc: isModrinth
        ? "Gehe zum Reiter `Einstellungen`."
        : "Gehe zum Reiter `Custom Commands`.",
    },
    {
      title: "Schritt 6: Pre-Launch Hook setzen",
      desc:
        `Füge den untenstehenden Befehl in das ` +
        (isModrinth ? "`Pre-Launch Hook`" : "`Pre-Launch Command`") +
        ` Feld ein.`,
    },
    {
      title: "Schritt 7: Java Argumente setzen",
      desc: "Füge die untenstehenden Java-Argumente in das `JVM-Argumente` Feld ein.",
    },
  ];

  await interaction.deferUpdate();

  const files: { attachment: string; name: string }[] = [];
  const embeds: EmbedBuilder[] = [];

  for (let i = 0; i < steps.length; i++) {
    const imageName = `${folder}_install${i + 1}.png`;
    files.push({
      attachment: `./assets/${folder}/install${i + 1}.png`,
      name: imageName,
    });
    embeds.push(
      new EmbedBuilder()
        .setTitle(steps[i].title)
        .setDescription(steps[i].desc)
        .setImage(`attachment://${imageName}`)
        .setColor(0x00aeff),
    );
  }

  files.push({
    attachment: "./assets/MCModded.mrpack",
    name: "MCModded.mrpack",
  });

  await interaction.message.edit({
    content:
      `### ✅ Pre-Launch Hook – ${launcherName}\n\n` +
      "**Pre-Launch Hook Befehl:**\n" +
      `\`\`\`bash\n${PRE_LAUNCH_HOOK}\n\`\`\`\n\n` +
      "**Java Argumente:**\n" +
      `\`\`\`\n${JAVA_START_TAGS}\n\`\`\``,
    embeds,
    components: [buildFertigRow()],
    files,
  });

  await waitForFertig(interaction);
}

async function handleOwnLauncher(interaction: ButtonInteraction) {
  await interaction.update({
    content:
      "### Eigener Launcher\n\n" +
      "**Pre-Launch Hook Befehl:**\n" +
      `\`\`\`bash\n${PRE_LAUNCH_HOOK}\n\`\`\`\n\n` +
      "Füge diesen Befehl in den Pre-Launch Hook Einstellungen deines Launchers ein.\n\n" +
      "### ☕ Java Start Tags\n" +
      "Füge diese JVM-Argumente in den Java-Einstellungen deines Launchers hinzu.\n\n" +
      "**Wo finden?**\n" +
      "- **Prism Launcher:** Einstellungen → Java → Java Arguments\n" +
      "- **Modrinth:** Einstellungen → Java → JVM Arguments\n" +
      "- **MultiMC:** Einstellungen → Java → JVM Arguments\n" +
      "- **ATLauncher:** Settings → Java → Extra JVM Arguments\n\n" +
      "**Tags:**\n" +
      `\`\`\`bash\n${JAVA_START_TAGS}\n\`\`\``,
    components: [buildFertigRow()],
  });

  await waitForFertig(interaction);
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
  try {
    const fertig = await interaction.channel!.awaitMessageComponent({
      filter: (i) => i.customId === "fertig",
      componentType: ComponentType.Button,
      time: 300_000,
    });

    await fertig.update({ content: "✅", embeds: [], components: [] });
  } catch {
    // Timeout
  }
}
