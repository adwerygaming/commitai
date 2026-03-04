export interface BaseDatabaseSchema {
    id: string;
    created_at: string;
    last_updated_at: string;
}

export interface ProjectSchema extends BaseDatabaseSchema {
    project_path: string
    name: string,
}

export interface CommitSchema extends BaseDatabaseSchema {
    project_id: string
    changes: string // actually this is string[]
}

export interface StatSchema extends BaseDatabaseSchema {
    commit_id: string
    model_version: string
    prompt_token_count: number
    candidates_token_count: number
    total_token_count: number
}

export interface DatabaseTables {
    projects: ProjectSchema,
    commits: CommitSchema,
    stats: StatSchema
} 