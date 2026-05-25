import fs from 'node:fs';
import path from 'node:path';
import { type SimpleGit, simpleGit } from 'simple-git';
import Tags from '../utils/Tags.js';
import { fileURLToPath } from 'url';

interface ProcessPromtProps {
    content: string;
    additionalContext?: string | null;
    projectContext?: string | null;
}

interface ProceededPromts {
    systemPrompt: string;
    userPrompt: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CommitAI {    
    private readonly directoryPath: string

    constructor (
        directoryPath: string
    ) {
        this.directoryPath = directoryPath
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

    async fetchSystemPromt(): Promise<string> {
        const assetsPath = path.join(__dirname, "..", "assets")
        const systemPromtPath = path.join(assetsPath, "systemPromt.txt")
        const systemPromt = fs.readFileSync(systemPromtPath, "utf-8")
        return systemPromt
    }

    async processPromt({ content, additionalContext, projectContext }: ProcessPromtProps): Promise<ProceededPromts> {
        const systemPrompt = await this.fetchSystemPromt()

        if (content.length > 10000) {
            console.log(`[${Tags.Warn}] The git diff content is too long (${content.length} characters). Truncating to 10000 characters for better performance.`)
            content = content.slice(0, 10000)
        }

        const partsProjectContext = projectContext ? [
            "[START OF PROJECT CONTEXT]",
            projectContext ?? "No project context provided. You may proceed.",
            "[END OF PROJECT CONTEXT]",
        ] : []

        const partsAdditionalContext = additionalContext ? [
            "[START OF ADDITIONAL CONTEXT]",
            additionalContext ?? "No additional context provided. You may proceed.",
            "[END OF ADDITIONAL CONTEXT]",
        ] : []

        const partsGitDiff = content ? [
            "[START OF GIT DIFF]",
            content ?? "No git diff provided. You may proceed.",
            "[END OF GIT DIFF]",
        ] : []

        const userPrompt = partsProjectContext.concat(partsAdditionalContext).concat(partsGitDiff).join("\n")

        return {
            systemPrompt,
            userPrompt
        }
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