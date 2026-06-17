import { cleanupActivePolls } from "./cleanup-active-polls";

/**
 * Code which should run at startup of the bot
 */
export async function startup() {
  cleanupActivePolls();
}
