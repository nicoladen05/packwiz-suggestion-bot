import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { activePoll } from "../../db/schema";

/**
 * Cleans up any polls which expired while the bot wasn't online
 */
export async function cleanupActivePolls() {
  const activePolls = await db.select().from(activePoll);

  const expiredPollIds = activePolls
    .filter((poll) => poll.finishesAt < new Date().toISOString())
    .map((poll) => poll.messageId);

  await db
    .delete(activePoll)
    .where(inArray(activePoll.messageId, expiredPollIds));
}
