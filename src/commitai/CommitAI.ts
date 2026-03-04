import fs from 'node:fs';
import path from 'node:path';
import { SimpleGit, simpleGit } from 'simple-git';
import Tags from '../utils/Tags.js';

export class CommitAI {    
    private readonly directoryPath: string

    constructor (
        directoryPath: string
    ) {
        this.directoryPath = directoryPath
    }

    git(): SimpleGit {
        return simpleGit(this.directoryPath)
    }

    async isRepo(): Promise<boolean> {
        return await this.git().checkIsRepo()
    }

    async currentBranch(): Promise<string> {
        const branchLocal = await this.git().branchLocal()
        const current = branchLocal.current
        return current
    }

    async checkGitIgnoreFile(): Promise<true> {
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
        const checkRepo = this.isRepo()
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

        return changes
    }

    async addFiles(): Promise<string> {
        return await this.git().add(".")
    }

    async push(changes: string[]): Promise<boolean> {
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

        const currentBranch = await this.currentBranch()
        console.log("")
        console.log(`[${Tags.Git}] Pushing to branch ${currentBranch}...`)

        // STEP 3 - PUSH
        await this.git().push()

        return true
    }
}