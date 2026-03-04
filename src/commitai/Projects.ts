import { type Knex } from "knex"
import fs from "node:fs"
import path from "node:path"
import { v7 as uuidv7 } from 'uuid'
import DatabaseClient from "../database/Client.js"
import { type ProjectSchema } from "../types/DatabaseTables.js"
import Tags from "../utils/Tags.js"

export class Projects {
    private readonly directoryPath: string
    private db(): Knex.QueryBuilder<ProjectSchema, ProjectSchema[]> {
        return DatabaseClient.table<ProjectSchema>("projects")
    }

    constructor(
        directoryPath: string
    ) {
        this.directoryPath = directoryPath
    }

    async init(): Promise<ProjectSchema> {
        const check = await this.resolve()

        if (!check) {
            return await this.set()
        }

        return check
    }

    async resolve(): Promise<ProjectSchema | null> {
        const res = await this.db()
            .select("*")
            .where("project_path", this.directoryPath)
            .first()

        return res ?? null
    }

    async set(): Promise<ProjectSchema> {
        // example: /home/masdepan/programming/[commitai] <--- this
        // res: commitai
        // fallback to uuid if failed. just in case ehehe.
        const projectName = path.basename(this.directoryPath) || uuidv7()
        
        const [res] = await this.db()
            .insert({
                name: projectName,
                project_path: this.directoryPath // unique tbh
            })
            .onConflict("project_path")
            .merge(["name"])
            .returning("*")

        return res
    }

    async fetchContext(): Promise<string | null> {
        const project = await this.resolve()
        const commitAIDirPath = path.join(this.directoryPath, ".commitai")

        const contextFilePath = path.join(commitAIDirPath, "commitai.md")
        const contextFile = fs.existsSync(contextFilePath)

        if (!contextFile) {
            console.log(`[${Tags.Info}] This project doesn't have CommitAI.md file`)
            console.log(`[${Tags.Info}] You can make the commit messages better by specifying context on commitai.md.`)
            return null
        } else {
            console.log(`[${Tags.CommitAI}] Loaded ${project?.name} CommitAI.md`)
            const content = fs.readFileSync(contextFilePath, "utf-8")
            return content
        }
    }
}