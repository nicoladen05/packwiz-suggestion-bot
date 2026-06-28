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
import type { Message } from "discord.js";
import type { Command } from "../../client";

const LAUNCHERS = {
  modrinth: {
    name: "Modrinth",
    folder: "modrinth",
    download: "https://modrinth.com/app",
    tutorial: "https://www.youtube.com/watch?v=H15cF7LyjEY",
  },
  prism: {
    name: "Prism Launcher",
    folder: "prism",
    download: "https://prismlauncher.org/download",
    tutorial: "https://www.youtube.com/watch?v=97zVcuHeCcs",
  },
} as const;

const PRE_LAUNCH_HOOK = `java -jar packwiz-installer-bootstrap.jar https://raw.githubusercontent.com/TobiHxD/CreateModpack/refs/heads/main/pack.toml`;
const PRISM_IMPORT_URL = "https://github.com/TobiHxD/CreateModpack/raw/refs/heads/main/PrismLauncher.zip";

const JAVA_START_TAGS = "-XX:+UseZGC -XX:+ZGenerational";
const TIMEOUT = 600_000;

const installSteps = [
  [
    {
      modrinth: "Schritt 1: Mrpack herunterladen",
      prism: "Schritt 1: Instanz erstellen",
    },
    {
      modrinth:
        "Lade das beigefügte `.mrpack` herunter.\nDieses enthält die Modpack-Konfiguration.",
      prism: "Klicke auf `Instanz erstellen`.",
    },
    "install1.png",
    true,
  ],
  [
    {
      modrinth: "Schritt 2: Neue Instanz erstellen",
      prism: "Schritt 2: Importieren auswählen",
    },
    {
      modrinth:
        "Öffne den Launcher und erstelle eine neue Instanz.\nWähle die gewünschte Minecraft-Version.",
      prism: "Klicke links auf `Importieren`.",
    },
    "install2.png",
    false,
  ],
  [
    {
      modrinth: "Schritt 3: Mrpack importieren",
      prism: "Schritt 3: URL importieren",
    },
    {
      modrinth:
        "Klicke auf `Import` und wähle die heruntergeladene `.mrpack`-Datei aus.\nDie Modifikationen werden automatisch übernommen.",
      prism: `Füge diese URL ein und klicke auf \`OK\`:\n${PRISM_IMPORT_URL}`,
    },
    "install3.png",
    true,
  ],
  [
    "Schritt 4: Instanz-Einstellungen öffnen",
    {
      modrinth: "Klicke auf die drei Punkte (`⋯`) → `Einstellungen`.",
      prism: "Rechtsklick auf die Instanz → `Einstellungen`.",
    },
    "install4.png",
    false,
  ],
  [
    "Schritt 5: Einstellungen navigieren",
    {
      modrinth: "Gehe zum Reiter `Einstellungen`.",
      prism: "Gehe zum Reiter `Custom Commands`.",
    },
    "install5.png",
    false,
  ],
  [
    "Schritt 6: Pre-Launch Hook setzen",
    {
      modrinth: "Füge den Befehl in das `Pre-Launch Hook` Feld ein.",
      prism: "Füge den Befehl in das `Pre-Launch Command` Feld ein.",
    },
    "install6.png",
    false,
  ],
  [
    "Schritt 7: Java Argumente setzen",
    "Füge die untenstehenden Java-Argumente in das `JVM-Argumente` Feld ein.",
    "install7.png",
    false,
  ],
] as const;

type LauncherId = keyof typeof LAUNCHERS;
type ButtonId =
  | LauncherId
  | "own-launcher"
  | "done"
  | "fertig"
  | "prev-step"
  | "next-step";

export default {
  data: new SlashCommandBuilder()
    .setName("download")
    .setDescription("Full tutorial on how to install and setup everything."),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const response = await interaction.reply({
      content: "### Wähle deinen Launcher aus\nWelchen Launcher verwendest du?",
      components: [
        buttonRow([
          ["modrinth", "Modrinth", ButtonStyle.Primary],
          ["prism", "Prism Launcher", ButtonStyle.Primary],
          ["own-launcher", "Eigener Launcher", ButtonStyle.Secondary],
        ]),
      ],
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    const message = response.resource?.message;
    if (!message) return;

    try {
      const choice = await waitForButton(
        message,
        interaction.user.id,
        ["modrinth", "prism", "own-launcher"],
        120_000,
      );
      if (choice.customId === "own-launcher") return handleOwnLauncher(choice);

      await handleLauncher(choice, LAUNCHERS[choice.customId as LauncherId]);
    } catch {
      // Timeout
    }
  },
} satisfies Command;

async function handleLauncher(
  interaction: ButtonInteraction,
  launcher: (typeof LAUNCHERS)[LauncherId],
) {
  await interaction.update({
    content: `### ${launcher.name}\nLade den Launcher herunter und installiere Minecraft. Folge dem Tutorial falls nötig.`,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Download")
          .setStyle(ButtonStyle.Link)
          .setURL(launcher.download),
        new ButtonBuilder()
          .setLabel("YouTube Tutorial")
          .setStyle(ButtonStyle.Link)
          .setURL(launcher.tutorial),
        new ButtonBuilder()
          .setCustomId("done")
          .setLabel("Fertig")
          .setStyle(ButtonStyle.Success),
      ),
    ],
  });

  try {
    const done = await waitForButton(
      interaction.message,
      interaction.user.id,
      ["done"],
      TIMEOUT,
    );
    await showPreLaunchHook(done, launcher);
  } catch {
    // Timeout
  }
}

async function showPreLaunchHook(
  interaction: ButtonInteraction,
  launcher: (typeof LAUNCHERS)[LauncherId],
) {
  let currentStep = 0;

  await interaction.update(renderStep(launcher, currentStep));

  try {
    while (true) {
      const nav = await waitForButton(
        interaction.message,
        interaction.user.id,
        ["prev-step", "next-step", "fertig"],
        TIMEOUT,
      );
      if (nav.customId === "fertig") {
        await finish(nav);
        return;
      }

      currentStep += nav.customId === "next-step" ? 1 : -1;
      await nav.update(renderStep(launcher, currentStep));
    }
  } catch {
    // Timeout
  }
}

function renderStep(launcher: (typeof LAUNCHERS)[LauncherId], index: number) {
  const [title, description, image, includeMrpack] = installSteps[index];
  const isFirst = index === 0;
  const isLast = index === lastStepIndex(launcher.folder);
  const imageName = `${launcher.folder}_${image}`;
  const stepTitle = resolveStepText(title, launcher.folder);
  const desc = resolveStepText(description, launcher.folder);

  let content = `### ✅ Pre-Launch Hook – ${launcher.name}\n\n**${stepTitle}**`;
  if (isLast && launcher.folder !== "prism") {
    content += `\n\n**Pre-Launch Hook Befehl:**\n\`\`\`bash\n${PRE_LAUNCH_HOOK}\n\`\`\`\n\n**Java Argumente:**\n\`\`\`\n${JAVA_START_TAGS}\n\`\`\``;
  }

  return {
    content,
    embeds: [
      new EmbedBuilder()
        .setTitle(stepTitle)
        .setDescription(desc)
        .setImage(`attachment://${imageName}`)
        .setColor(0x00aeff),
    ],
    components: [
      buttonRow([
        ...(isFirst
          ? []
          : [["prev-step", "← Zurück", ButtonStyle.Secondary] as const]),
        isLast
          ? ["fertig", "Fertig", ButtonStyle.Success]
          : ["next-step", "Weiter →", ButtonStyle.Primary],
      ]),
    ],
    attachments: [],
    files: [
      { attachment: `./assets/${launcher.folder}/${image}`, name: imageName },
      ...(includeMrpack && launcher.folder === "modrinth"
        ? [{ attachment: "./assets/MCModded.mrpack", name: "MCModded.mrpack" }]
        : []),
    ],
  };
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
    components: [buttonRow([["fertig", "Fertig", ButtonStyle.Success]])],
  });

  try {
    const fertig = await waitForButton(
      interaction.message,
      interaction.user.id,
      ["fertig"],
      300_000,
    );
    await finish(fertig);
  } catch {
    // Timeout
  }
}

function lastStepIndex(folder: (typeof LAUNCHERS)[LauncherId]["folder"]) {
  return folder === "prism" ? 2 : installSteps.length - 1;
}

function resolveStepText(
  text: string | Record<(typeof LAUNCHERS)[LauncherId]["folder"], string>,
  folder: (typeof LAUNCHERS)[LauncherId]["folder"],
) {
  return typeof text === "string" ? text : text[folder];
}

function buttonRow(
  buttons: readonly (readonly [ButtonId, string, ButtonStyle])[],
) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...buttons.map(([id, label, style]) =>
      new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style),
    ),
  );
}

function waitForButton(
  message: Message,
  userId: string,
  customIds: readonly ButtonId[],
  time: number,
) {
  return message.awaitMessageComponent({
    filter: (i) =>
      i.user.id === userId && customIds.includes(i.customId as ButtonId),
    componentType: ComponentType.Button,
    time,
  });
}

function finish(interaction: ButtonInteraction) {
  return interaction.update({
    content: "✅",
    embeds: [],
    components: [],
    attachments: [],
  });
}
