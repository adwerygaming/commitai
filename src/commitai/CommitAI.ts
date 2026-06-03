import fs from 'node:fs';
import path from 'node:path';
import { type ChatModel, type CompletionUsage } from 'openai/resources';
import { type SimpleGit, simpleGit } from 'simple-git';
import { fileURLToPath } from 'url';
import { AIProvider } from '../AIProvider/AIProvider.js';
import Tags from '../utils/Tags.js';
import { Commits } from './Commits.js';
import { Projects } from './Projects.js';
import { Stats } from './Stats.js';

interface SummarizeProp {
    diffChanges: string;
    userContext?: string | null;
}

interface SummarizeResult {
    changes: string[]
    usageMetadata?: CompletionUsage
    model?: ChatModel | string
}

interface ProceededPromts {
    systemPrompt: string;
    userPrompt: string;
}

enum SystemPromptType {
    SUMMARY = "summary",
    GIT_COMMIT = "gitCommit"
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aiProvider = new AIProvider()

export class CommitAI {    
    private readonly directoryPath: string
    private projects: Projects

    constructor (
        directoryPath: string
    ) {
        this.directoryPath = directoryPath
        this.projects = new Projects(directoryPath)
    }

    // GitHub
    git(): SimpleGit {
        return simpleGit(this.directoryPath)
    }

    async addFiles(): Promise<string> {
        return await this.git().add(".")
    }

    async getRepoStatus(): Promise<boolean> {
        return await this.git().checkIsRepo()
    }

    async getCurrentBranch(): Promise<string> {
        const branchLocal = await this.git().branchLocal()
        const current = branchLocal.current
        return current
    }

    async push(changes: string[]): Promise<boolean> {
        try {
            // STEP 1 - ADD THE FILES
            await this.git().add(".")
            console.log(`[${Tags.Git}] Added "." files on this project.`)

            // STEP 2 - COMMIT
            const title = changes[0]
            const body = changes.slice(1).join("\n")

            console.log("")
            console.log(`[${Tags.Git}] Commiting ${changes.length} changes.`)
            changes.forEach((change) => console.log(`[${Tags.Git}] ${change}`))

            const commitMessages = [title, body].filter(Boolean)
            await this.git().commit(commitMessages)

            const currentBranch = await this.getCurrentBranch()
            console.log("")
            console.log(`[${Tags.Git}] Pushing to branch ${currentBranch}...`)

            // STEP 3 - PUSH
            await this.git().push()

            return true
        } catch (e) {
            console.log(`[${Tags.Error}] Failed to push.`)
            console.error(e)
            return false
        }
    }

    // ====================================

    async fetchSystemPrompt(type: SystemPromptType): Promise<string> {
        const assetsPath = path.join(__dirname, "..", "assets")

        if (type === "summary") {
            const summaryPromptPath = path.join(assetsPath, "summaryPrompt.txt")
            const summaryPrompt = fs.readFileSync(summaryPromptPath, "utf-8")
            return summaryPrompt
        } else if (type === "gitCommit") {
            const gitCommitPromptPath = path.join(assetsPath, "gitCommitPrompt.txt")
            const gitCommitPrompt = fs.readFileSync(gitCommitPromptPath, "utf-8")
            return gitCommitPrompt
        } else {
            throw new Error(`Unsupported system prompt type: ${type}`)
        }
    }

    private chunkContent(content: string, maxLength: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < content.length; i += maxLength) {
            chunks.push(content.substring(i, i + maxLength));
        }
        return chunks;
    }

    // 2. The recursive summarizer
    private async summarizeLargeContent(content: string): Promise<string> {
        const MAX_LENGTH = 10000;

        if (content.length <= MAX_LENGTH) {
            return content;
        }

        console.log(`[${Tags.CommitAI}] Content length (${content.length}) exceeds ${MAX_LENGTH}.`);

        const chunks = this.chunkContent(content, MAX_LENGTH);

        console.log(`[${Tags.CommitAI}] Content has been split into ${chunks.length} chunk(s).`);

        const summarySystemPrompt = await this.fetchSystemPrompt(SystemPromptType.GIT_COMMIT);

        const summaryPromises = chunks.map(async (chunk, index) => {
            const userPrompt = `Chunk ${index + 1} of ${chunks.length}:\n\n${chunk}`;

            const result = await aiProvider.generate({
                systemPrompt: summarySystemPrompt,
                userPrompt: userPrompt
            });

            if (!result) {
                console.log(`[${Tags.CommitAI}] Failed to summarize chunk ${index + 1}. Using original chunk as fallback.`);
                return null;
            }

            return result.content;
        });

        const summaries = await Promise.all(summaryPromises);

        const combinedSummary = summaries.join('\n\n--- [NEXT CHUNK SUMMARY] ---\n\n');

        return this.summarizeLargeContent(combinedSummary);
    }

    sanitizeResponse(dirtyResponse: string): string {
        const sanitized = dirtyResponse?.replace("```json", "")?.replace("```", "")
        return sanitized
    }

    async processPrompt({ diffChanges, userContext }: SummarizeProp): Promise<ProceededPromts> {
        const systemPrompt = await this.fetchSystemPrompt(SystemPromptType.GIT_COMMIT)
        const projectContext = await this.projects.getContext()

        if (diffChanges.length > 10000) {
            diffChanges = await this.summarizeLargeContent(diffChanges)
        }

        const partsProjectContext = projectContext ? [
            "[START OF PROJECT CONTEXT]",
            projectContext ?? "No project context provided. You may proceed.",
            "[END OF PROJECT CONTEXT]",
        ] : []

        const partsAdditionalContext = userContext ? [
            "[START OF ADDITIONAL CONTEXT]",
            userContext ?? "No additional context provided. You may proceed.",
            "[END OF ADDITIONAL CONTEXT]",
        ] : []

        const partsGitDiff = diffChanges ? [
            "[START OF GIT DIFF]",
            diffChanges ?? "No git diff provided. You may proceed.",
            "[END OF GIT DIFF]",
        ] : []

        const userPrompt = partsProjectContext.concat(partsAdditionalContext).concat(partsGitDiff).join("\n")

        return {
            systemPrompt,
            userPrompt
        }
    }

    async summarize({ diffChanges, userContext }: SummarizeProp): Promise<SummarizeResult | null> {
        const { systemPrompt, userPrompt } = await this.processPrompt({ diffChanges, userContext });

        // console.log(systemPrompt)
        // console.log(userPrompt)

        const data = await aiProvider.generate({
            systemPrompt,
            userPrompt
        })

        if (!data) {
            console.log(`[${Tags.CommitAI}] Failed to get response from AI.`)
            return null
        }

        const { content, usageMetadata, model } = data

        const sanitizedContent = this.sanitizeResponse(content)
        const parsedContents = JSON.parse(sanitizedContent) as string[]
        const parsedContentLength = parsedContents.length - 1 // -1 bcs for title

        console.log(`[${Tags.CommitAI}] Parsed AI Contents: ${parsedContentLength ?? 0} change${parsedContentLength > 1 ? "s" : ""}`)

        return {
            changes: parsedContents,
            usageMetadata,
            model
        }
    }

    async logSummary(data: SummarizeResult): Promise<boolean> {
        const project = await this.projects.resolvePath()
        if (!project) {
            console.log(`[${Tags.Error}] Failed to resolve project. Cannot log summary.`)
            return false
        }

        const commit = new Commits(project.id)
        const addCommitRes = await commit.add(data.changes)
        const stat = new Stats(addCommitRes.id)

        await stat.add({
            model_version: data.model ?? "Unknown Model",
            prompt_token_count: data.usageMetadata?.prompt_tokens ?? 0,
            total_token_count: data.usageMetadata?.total_tokens ?? 0,
            candidates_token_count: 0,
        })
        return true
    }

    async checkGitIgnoreFile(): Promise<true> {
        try {
            const ignoreFilePath = path.join(this.directoryPath, ".gitignore")
            const ignoreFileContentRaw = fs.readFileSync(ignoreFilePath, "utf-8")
            const ignoreFileContents = ignoreFileContentRaw.split("\n").filter((x) => x.length > 0 && !x.startsWith("#"))

            const entryValue = ".commitai/*"

            if (!ignoreFileContents.includes(entryValue)) {
                console.log(`[${Tags.CommitAI}] Added .commitai entry on .gitignore file`)
                const newEntry = `\n\n# This line was added by .commitai\n# This is a directory for storing commitai stuff to make commit generation better\n${entryValue}`
                fs.appendFileSync(ignoreFilePath, newEntry)
            }

            return true
        } catch (e) {
            throw new Error(`Failed to check .gitignore file.`, { cause: e})
        }
    }

    async fetchConfigDir(): Promise<string> {
        const commitAIDirPath = path.join(this.directoryPath, ".commitai")
        const commitAIDirExists = fs.existsSync(commitAIDirPath)
        if (!commitAIDirExists) {
            fs.mkdirSync(commitAIDirPath)
        }

        return commitAIDirPath
    }

    async fetchGitChanges(): Promise<string | null> {
        const checkRepo = await this.getRepoStatus()
        if (!checkRepo) return null

        const ignoredFiles: string[] = [
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "*.lock",
        ]

        const ignoredFilesArgs = ignoredFiles.map((x) => `:!${x}`)

        const trackedDiff = await this.git().diff(['HEAD', '--', ...ignoredFilesArgs])
        const untrackedFiles = await this.git().raw(['ls-files', '--others', '--exclude-standard'])
        const changes = [trackedDiff, untrackedFiles].filter(Boolean).join("\n")

        const lineCount = changes?.split(/\r?\n/)?.length
        console.log(`[${Tags.Git}] Found ${lineCount} lines of changes.`)

        return changes
    }
}