import { Knex } from "knex"
import DatabaseClient from "../database/Client.js"
import { CommitSchema } from "../types/DatabaseTables.js"

export class Commits {
    private readonly projectId: string
    private db(): Knex.QueryBuilder<CommitSchema, CommitSchema[]> {
        return DatabaseClient.table<CommitSchema>("commits")
    }

    constructor(
        projectId: string
    ) {
        this.projectId = projectId
    }

    async add(changes: string[]): Promise<CommitSchema> {
        const [res] = await this.db()
            .insert({
                changes,
                project_id: this.projectId
            })
            .returning("*")

        return res
    }

    async destroy(commitId: string): Promise<CommitSchema> {
        const [res] = await this.db()
            .where("id", commitId)
            .delete()
            .returning("*")
        
        return res
    }

    async getById(commitId: string): Promise<CommitSchema[]> {
        const res = await this.db()
            .select("*")
            .where("id", commitId)

        return res
    }

    async getByProjectId(): Promise<CommitSchema[]> {
        const res = await this.db()
            .select("*")
            .where("project_id", this.projectId)
        
        return res
    }
}