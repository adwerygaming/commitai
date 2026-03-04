CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    project_path    TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL
);

-- Commits
CREATE TABLE IF NOT EXISTS commits (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    changes         JSONB       NOT NULL DEFAULT '[]'
);

-- Stats
CREATE TABLE IF NOT EXISTS stats (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    commit_id               UUID        NOT NULL UNIQUE REFERENCES commits(id) ON DELETE CASCADE,
    model_version           TEXT        NOT NULL,
    prompt_token_count      INT         NOT NULL DEFAULT 0,
    candidates_token_count  INT         NOT NULL DEFAULT 0,
    total_token_count       INT         NOT NULL DEFAULT 0
);

-- Auto-update last_updated_at
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_projects_updated
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_at();

CREATE OR REPLACE TRIGGER trg_commits_updated
    BEFORE UPDATE ON commits
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_at();

CREATE OR REPLACE TRIGGER trg_stats_updated
    BEFORE UPDATE ON stats
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_at();
