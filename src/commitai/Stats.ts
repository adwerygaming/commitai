import { type Knex } from "knex"
import DatabaseClient from "../database/Client.js"
import { type StatSchema } from "../types/DatabaseTables.js"

type AddCommitStatProp = Omit<StatSchema, "id" | "created_at" | "last_updated_at" | "commit_id">

export class Stats {
    private readonly commitId: string
    private db(): Knex.QueryBuilder<StatSchema, StatSchema[]> {
        return DatabaseClient.table<StatSchema>("stats")
    }
    
    constructor(
        commitId: string
    ) {
        this.commitId = commitId
    }

    async add({ candidates_token_count, model_version, prompt_token_count, total_token_count }: AddCommitStatProp): Promise<StatSchema> {
        const [res] = await this.db()
            .insert({
                commit_id: this.commitId,
                candidates_token_count,
                model_version,
                prompt_token_count,
                total_token_count
            })
            .returning("*")

        return res
    }

    async destroy(statsId: string): Promise<StatSchema> { 
        const [res] = await this.db()
            .where("id", statsId)
            .delete()
            .returning("*")
        
        return res
    }

    async getById(statsId: string): Promise<StatSchema[]> {
        const res = await this.db()
            .select("*")
            .where("id", statsId)

        return res
    }

    async getByCommitId(): Promise<StatSchema[]> {
        const res = await this.db()
            .select("*")
            .where("commit_id", this.commitId)

        return res
    }
}