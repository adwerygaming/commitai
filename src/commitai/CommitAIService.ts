import { execSync } from "child_process";
import fs from "fs";
import humanNumber from "human-number";
import notifier from 'node-notifier';
import path from "path";
import { type SummaryGitChangesStatsResponse } from "../gemini/GeminiService.js";
import Tags from "../utils/Tags.js";
import CommitAIHelper from "./CommitAIServiceHelper.js";

interface GetRepoDiffContentProp {
    projectDir: string;
}

export interface GetRepoDiffContentResponse {
    data: string | null;
    error?: "not_in_repository";
}

interface SendNotificationProp {
    message: string
    timeout?: number
}

interface WriteCommitMessageProp {
    projectDir: string;
    changes: string[]
    stats: SummaryGitChangesStatsResponse
    showAIWatermark?: boolean
}

interface WriteCommitMessageResponse {
    success: boolean;
    elapsed?: number
    error?: "execute_failed"
}

const commitAIFilename = ".commitai"

const CommitAIService = {
    Helper: CommitAIHelper,
    
    /**
     * Create CommitAI Identifier file for identifying project.
     * @param {string} projectDir - The project directory path
     * @returns {Promise<void>}
     * @throws {Error} When failed to create identifier file
     */
    async CreateIdentifierFile(projectDir: string): Promise<void> {
        const commitAIIdentifierFIle = path.join(projectDir, commitAIFilename);
        try {
            const uuid = crypto.randomUUID()
            await fs.writeFileSync(commitAIIdentifierFIle, `${uuid}`);
            console.log(`[${Tags.System}] Created new CommitAI Identifier: ${uuid}`)
        } catch {
            throw new Error("failed_to_create_identifier_file");
        }
    },

    /**
     * Check if project's .gitignore already has ".commitai" added.
     * If not found, adds it to the .gitignore file.
     * @param {string} projectDir - The project directory path
     * @returns {Promise<void>}
     */
    async UpdateGitignoreFile(projectDir: string): Promise<void> {
        const gitignorePath = path.join(projectDir, ".gitignore");
        const gitIgnoreFileExists = fs.existsSync(gitignorePath)

        if (gitIgnoreFileExists) {
            const content = fs.readFileSync(gitignorePath, "utf-8")

            // split by newlines
            const splitted = content?.split("\n")

            const found = splitted?.filter((x) => x == commitAIFilename)

            if (found.length == 0) {
                const addition = `\n# This line was added by CommitAI.\n${commitAIFilename}`

                await fs.appendFileSync(gitignorePath, addition)

                console.log(`[${Tags.System}] Added ${commitAIFilename} into .gitignore file..`)
            }
        } else {
            console.log(`[${Tags.Debug}] no gitignore file`)
        }
    },

    /**
     * Sends a desktop notification.
     * @param {SendNotificationProp} props - Notification properties
     * @param {string} props.message - The notification message
     * @param {number} [props.timeout] - Notification timeout in seconds (default: 5)
     * @returns {void}
     */
    SendDesktopNotification({ message, timeout }: SendNotificationProp): void {
        notifier.notify({
            title: 'CommitAI',
            message,
            sound: true,
            wait: true,
            timeout: timeout ?? 5
        });
    },

    /**
     * Parses and retrieves the git repository diff content.
     * @param {GetRepoDiffContentProp} props - Properties for getting diff
     * @param {string} props.projectDir - The project directory path
     * @returns {Promise<GetRepoDiffContentResponse>} The diff content or error
     */
    async GetRepoDiffContent({ projectDir }: GetRepoDiffContentProp): Promise<GetRepoDiffContentResponse> {
        let data = null

        await this.UpdateGitignoreFile(projectDir);

        const ignoredFiles: string[] = [
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "*.lock",
        ]

        const ignoredArgs = ignoredFiles.map((x) => `":!"${x}"`).join(" ")

        try {
            data = execSync(`git diff HEAD -- ${ignoredArgs}`, {
                cwd: projectDir,
                stdio: "pipe",
                encoding: "utf-8",
            });
        } catch (e: any) {
            const msg = e?.message as string
            if (msg.includes("Not a git repository")) {
                return { data: null, error: "not_in_repository" }
            }
        }

        return { data }
    },

    /**
     * Handles writing commit message and pushing changes to git.
     * Executes git add, git commit, and git push commands.
     * @param {WriteCommitMessageProp} props - Properties for writing commit
     * @param {string} props.projectDir - The project directory path
     * @param {string[]} props.changes - Array of commit messages
     * @param {SummaryGitChangesStatsResponse} props.stats - Statistics from AI generation
     * @param {boolean} [props.showAIWatermark] - Whether to show AI watermark in commit
     * @returns {Promise<WriteCommitMessageResponse>} Success status and elapsed time
     */
    async WriteCommitMessage({ projectDir, changes, stats, showAIWatermark }: WriteCommitMessageProp): Promise<WriteCommitMessageResponse> {
        if (!changes || changes.length == 0) {
            console.log(`[${Tags.Git}] Didn't receive string array of changes.`)
            return { success: false, elapsed: 0 }
        }

        const startTime = Date.now()

        let changesMessages = ""
        const title = changes[0]

        for (let i = 1; i < changes.length; i++) {
            const msg = changes[i];
            changesMessages += `${msg}\n`
        }

        const { modelVersion, usageMetadata } = stats
        const totalTokenRaw = usageMetadata?.totalTokenCount ?? 0
        const totalTokenFormatted = humanNumber(totalTokenRaw)

        if (showAIWatermark) changesMessages += `✨ Automatically Generated by Google Gemini (${modelVersion ?? "Unknown Model"}, wasted ${totalTokenFormatted} tokens)`

        const commands = [
            "git add .",
            "git commit " + `-m "${title}" -m "${changesMessages}"`,
            "git push"
        ]

        // exec on callerPath
        for (let i = 0; i < commands.length; i++) {
            const res = commands[i];

            if (!res) continue;

            try {
                console.log(`[${Tags.Git}] Running: ${res}`)
                execSync(res, { cwd: projectDir, stdio: "inherit" });
            } catch (e) {
                console.log(`[${Tags.Error}] Failed to run git command [${res}]`)
                console.error(e)
                return { success: false, error: "execute_failed" }
            }
        }

        const endTime = Date.now()
        const elapsed = endTime - startTime
        return { success: true, elapsed }
    }
}

export default CommitAIService;