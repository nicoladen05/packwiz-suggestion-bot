import simpleGit from "simple-git";
import type { SimpleGit } from "simple-git";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import PQueue from "p-queue";

export const packwizOperationQueue = new PQueue({ concurrency: 3 });

export class PackwizModpack {
  private initialized: boolean = false;
  private initPromise: Promise<void>;

  private repoUrl: string;
  private repoPath: string;
  private worktreePath: string;

  private git: SimpleGit;

  constructor(repoUrl: string, repoPath: string, worktreePath: string) {
    this.repoUrl = repoUrl;
    this.repoPath = repoPath;
    this.worktreePath = worktreePath;
    this.git = simpleGit(this.repoPath);

    this.initPromise = this.downloadRepository();
  }

  private async folderIsEmpty(path: string): Promise<boolean> {
    return (await readdir(path)).length === 0;
  }

  private async downloadRepository(): Promise<void> {
    try {
      await mkdir(this.repoPath, { recursive: true });
      await mkdir(this.worktreePath, { recursive: true });
    } catch (error) {
      console.error("Could not create repository directories:", error);
    }

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

      await worktreeGit.add("-A");
      await worktreeGit.commit(`add mod: ${slug}`);

      console.log(await worktreeGit.log());

      // await worktreeGit.push("origin", branchName);

      return true;
    } catch (error) {
      console.warn(`Failed to add modrinth mod ${slug}: `, error);
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
