import {
    Client,
    EmbedBuilder,
    Events,
    Message,
    MessageType,
    Poll,
    TextChannel,
} from "discord.js";
import { db } from "../../db";
import { activePoll, modpack, server } from "../../db/schema";
import { eq, InferSelectModel } from "drizzle-orm";
import { getProjectById } from "../../lib/modrinth";
import { PackwizModpack } from "../../lib/packwiz-modpack";

let client: Client;

export function registerPollFinishListener(discordClient: Client) {
    client = discordClient;

    client.on(Events.MessageCreate, async (message) => {
        if (message.type !== MessageType.PollResult) return;

        const poll = await getOriginalPoll(message);
        if (!poll) return;

        await handlePollResult(poll);
    });
}

/**
 * Gets the original poll that a pollResult was for
 * @param pollResult
 * @returns
 */
async function getOriginalPoll(pollResult: Message): Promise<Poll | undefined> {
    const pollMessageId = pollResult.reference?.messageId;
    const pollChannelId = pollResult.reference?.channelId;
    if (!pollMessageId || !pollChannelId) return;

    const pollChannel = await client.channels.fetch(pollChannelId);
    if (!pollChannel?.isTextBased()) return;

    const pollMessage = await pollChannel.messages.fetch(pollMessageId);

    return pollMessage?.poll ?? undefined;
}

async function handlePollResult(poll: Poll) {
    const pollChannel = poll.channel;
    if (!(pollChannel instanceof TextChannel)) return;

    const storedPoll = await getStoredPoll(poll);
    if (!storedPoll) return; // The poll wasn't one created by the bot

    const project = await getProjectById(storedPoll.projectId);
    if (!project) return;

    const pollAnswers = [...poll.answers.values()];

    const winningAnswer = pollAnswers.reduce((best, answer) =>
        answer.voteCount > best.voteCount ? answer : best,
    );

    // TODO find a better way to detect this
    const minVotes = await db
        .select({ minVotes: server.minVotes })
        .from(server)
        .where(eq(modpack.serverId, pollChannel.guildId))
        .then((res) => res[0].minVotes);

    if (
        winningAnswer.text !== "Ja, hinzufügen" &&
        winningAnswer.voteCount < minVotes
    )
        return;

    try {
        const modpack = await PackwizModpack.getForServer(pollChannel.guildId);
        if (!modpack) throw new Error("No modpack configured for this server");

        await modpack.addModrinthMod(storedPoll.projectId);

        await sendModAddedMessage(
            pollChannel,
            project.title ?? "eine neue Mod",
        );
    } catch (error) {
        await sendFailureMessage(
            pollChannel,
            project.title ?? "eine neue Mod",
            error as string,
        );
    } finally {
        await db
            .delete(activePoll)
            .where(eq(activePoll.messageId, poll.messageId));
    }
}

async function getStoredPoll(
    poll: Poll,
): Promise<InferSelectModel<typeof activePoll>> {
    return await db
        .select()
        .from(activePoll)
        .where(eq(activePoll.messageId, poll.messageId))
        .limit(1)
        .then((polls) => polls[0]);
}

async function sendModAddedMessage(channel: TextChannel, modName: string) {
    const embed = new EmbedBuilder()
        .setTitle(`${modName} Added`)
        .setDescription(
            "The mod has been added to the modpack. Restart your game to download it.",
        )
        .setColor("Green");

    await channel.send({ embeds: [embed] });
}

async function sendFailureMessage(
    channel: TextChannel,
    modName: string,
    error: string,
) {
    const embed = new EmbedBuilder()
        .setTitle(`Failed to Add ${modName}`)
        .setDescription(
            "The mod could not be added to the modpack. No changes were made.\n" +
                error,
        )
        .setColor("Red");

    await channel.send({ embeds: [embed] });
}
