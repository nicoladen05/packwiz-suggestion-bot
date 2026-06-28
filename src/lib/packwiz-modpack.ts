import simpleGit from "simple-git";
import type { SimpleGit } from "simple-git";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import PQueue from "p-queue";
import { createHash } from "node:crypto";
import { db } from "../db";
import { modpack } from "../db/schema";
import { eq } from "drizzle-orm";

const BASE_REPO_PATH = process.env.REPOS_PATH ?? "/tmp/packwiz-repos";
const BASE_WORKTREE_PATH =
  process.env.WORKTREE_PATH ?? "/tmp/packwiz-worktrees";
const GITHUB_HOST = "github.com";

const GIT_NAME = "Packwiz Bot";
const GIT_EMAIL = "packwiz@tn.bot";

export const packwizOperationQueue = new PQueue({ concurrency: 3 });

export class PackwizModpack {
  private initialized: boolean = false;
  private initPromise: Promise<void>;

  private repoUrl: string;
  private accessToken: string;
  private repoPath: string;
  private worktreePath: string;

  private git!: SimpleGit;

  constructor(repoUrl: string, accessToken: string) {
    this.repoUrl = repoUrl;
    this.accessToken = accessToken;
    const repoId = createHash("sha1").update(repoUrl).digest("hex");
    this.repoPath = path.join(BASE_REPO_PATH, repoId);
    this.worktreePath = path.join(BASE_WORKTREE_PATH, repoId);

    this.initPromise = this.downloadRepository();
  }

  /**
   * Gets the configured packwiz modpack for the given server.
   * @param serverId The ID of the server to get the modpack for.
   * @returns The configured packwiz modpack, or undefined if no modpack is configured for the server.
   */
  public static async getForServer(
    serverId: string,
  ): Promise<PackwizModpack | undefined> {
    const modpackConfig = await db
      .select({ url: modpack.url, accessToken: modpack.accessToken })
      .from(modpack)
      .where(eq(modpack.serverId, serverId))
      .then((modpacks) => (modpacks.length != 0 ? modpacks[0] : null));

    return modpackConfig
      ? new PackwizModpack(modpackConfig.url, modpackConfig.accessToken)
      : undefined;
  }

  private async folderIsEmpty(path: string): Promise<boolean> {
    return (await readdir(path)).length === 0;
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await mkdir(this.repoPath, { recursive: true });
      await mkdir(this.worktreePath, { recursive: true });
    } catch (error) {
      console.error("Could not create repository directories:", error);
    }
  }

  private async downloadRepository(): Promise<void> {
    await this.ensureDirectoriesExist();

    this.git = simpleGit(this.repoPath);
    this.git.addConfig("user.name", GIT_NAME);
    this.git.addConfig("user.email", GIT_EMAIL);

    if (await this.folderIsEmpty(this.repoPath)) {
      await this.git.clone(
        this.repoUrl,
        this.repoPath,
        { "--bare": null },
        (error, _) => {
          if (error) {
            console.error("Failed to clone modpack repository: ", error);
          }
        },
      );
    }

    this.initialized = true;
  }

  private async makeWorktree(name: string): Promise<string> {
    const worktreePath = path.join(this.worktreePath, name);

    // updates local main from remote
    await this.git.raw(["fetch", "origin", "main:main"]);

    await this.git.raw(["worktree", "add", "-b", name, worktreePath, "main"]);

    return worktreePath;
  }

  private getAuthenticatedGithubUrl(): string {
    if (this.accessToken.length === 0) {
      throw new Error("No GitHub access token configured for this server");
    }

    const repoUrl = new URL(this.repoUrl);
    if (repoUrl.hostname !== GITHUB_HOST) {
      throw new Error(`Packwiz repository must be hosted on ${GITHUB_HOST}`);
    }

    const [owner, repo, ...extraPathParts] = repoUrl.pathname
      .split("/")
      .filter((part) => part.length !== 0);

    if (!owner || !repo || extraPathParts.length !== 0) {
      throw new Error("Packwiz repository URL must be a GitHub owner/repo URL");
    }

    const repoName = repo.endsWith(".git") ? repo : `${repo}.git`;
    return `https://x-access-token:${encodeURIComponent(this.accessToken)}@${GITHUB_HOST}/${owner}/${repoName}`;
  }

  private redactAccessToken(value: string): string {
    if (this.accessToken.length === 0) return value;

    return value
      .replaceAll(this.accessToken, "[redacted]")
      .replaceAll(encodeURIComponent(this.accessToken), "[redacted]");
  }

  async addModrinthMod(slug: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initPromise;
    }

    const branchName = `add-${slug}`;
    const worktreePath = await this.makeWorktree(branchName);

    try {
      await execa("packwiz", ["mr", "add", slug, "-y"], {
        cwd: worktreePath,
      });

      const worktreeGit = simpleGit(worktreePath);
      worktreeGit.addConfig("user.name", GIT_NAME);
      worktreeGit.addConfig("user.email", GIT_EMAIL);

      await worktreeGit.add("-A");
      await worktreeGit.commit(`add mod: ${slug}`);

      await worktreeGit.push(this.getAuthenticatedGithubUrl(), branchName);

      return true;
    } catch (error) {
      console.warn(
        `Failed to add modrinth mod ${slug}: ${this.redactAccessToken(error instanceof Error ? error.message : String(error))}`,
      );
      return false;
    } finally {
      // Clean up the worktree
      await this.git
        .raw(["worktree", "remove", "--force", worktreePath])
        .catch(() => {
          console.error(`Failed cleaning up worktree ${worktreePath}`);
        });

      await rm(worktreePath, { recursive: true, force: true }).catch(() => {
        console.error(`Failed removing worktree folder ${worktreePath}`);
      });
    }
  }
}
