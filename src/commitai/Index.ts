import { DatabaseService } from "../database/DatabaseService";
import type { SummaryGitChangesStatsResponse } from "../gemini/GeminiService";
import { GeminiService } from "../gemini/GeminiService";
import type { AIPersonality } from "../types/CommitAITypes";
import Tags from "../utils/Tags";
import CommitAIService from "./CommitAIService";

interface GenerateCommitSummaryResponse {
    messages: string[];
    stats: SummaryGitChangesStatsResponse;
}

// Configuration
const CONFIG = {
    personality: "normal" as AIPersonality,
    showAIWatermark: false,
    exitCodes: {
        SUCCESS: 0,
        ENV_ERROR: 1,
        GIT_ERROR: 2,
        AI_ERROR: 3,
        COMMIT_ERROR: 4
    }
} as const;

const ERROR_MESSAGES = {
    NO_PROJECT_DIR: "No project directory found. Please run using the .sh file.",
    NOT_IN_REPO: "Not in a git repository. Please run this command inside a git repository.",
    NO_CHANGES: "No changes found in the repository.",
    NO_AI_RESPONSE: "No response from AI.",
    PARSE_FAILED: "Failed to parse AI response.",
    NO_SUMMARY_DATA: "No summary data received from AI.",
    NO_STATS: "No stats received from AI.",
    COMMIT_FAILED: "Failed to write commit message"
} as const;

/**
 * Pluralizes a word based on count.
 * @param count - The count to check
 * @param singular - The singular form
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns The pluralized string
 */
function pluralize(count: number, singular: string, plural?: string): string {
    return count === 1 ? singular : (plural || `${singular}s`);
}

/**
 * Handles errors by logging and exiting with appropriate code.
 * @param message - Error message to display
 * @param exitCode - Exit code to use
 */
function handleError(message: string, exitCode: number): never {
    console.log(`[${Tags.Error}] ${message}`);
    process.exit(exitCode);
}

/**
 * Validates that the project directory environment variable is set.
 * @returns The validated project directory path
 */
function validateEnvironment(): string {
    const projectDir = process.env.CALL_FROM;
    
    if (!projectDir) {
        handleError(ERROR_MESSAGES.NO_PROJECT_DIR, CONFIG.exitCodes.ENV_ERROR);
    }
    
    return projectDir;
}

/**
 * Fetches git diff content from the project directory.
 * @param projectDir - The project directory path
 * @returns The git diff content
 */
async function fetchGitDiff(projectDir: string): Promise<string> {
    const { data: gitDiffContent, error } = await CommitAIService.GetRepoDiffContent({ 
        projectDir 
    });

    if (error === "not_in_repository") {
        handleError(ERROR_MESSAGES.NOT_IN_REPO, CONFIG.exitCodes.GIT_ERROR);
    } else if (error) {
        handleError(`Failed to get git diff content: ${error}`, CONFIG.exitCodes.GIT_ERROR);
    }

    if (!gitDiffContent || gitDiffContent.length === 0) {
        handleError(ERROR_MESSAGES.NO_CHANGES, CONFIG.exitCodes.GIT_ERROR);
    }

    console.log(`[${Tags.System}] Found ${gitDiffContent.length} ${pluralize(gitDiffContent.length, "line")} of changes.`);
    
    return gitDiffContent;
}

/**
 * Generates commit message summary using AI.
 * @param diffContent - The git diff content
 * @param projectDir - The project directory path
 * @returns Object containing commit messages and statistics
 */
async function generateCommitSummary(diffContent: string, projectDir: string): Promise<GenerateCommitSummaryResponse> {
    const { data: commitMessages, error, stats } = await (await GeminiService()).SummaryGitChanges({ 
        diffContent, 
        personality: CONFIG.personality, 
        projectDir, 
        showWatermark: CONFIG.showAIWatermark 
    });

    if (error === "no_response") {
        handleError(ERROR_MESSAGES.NO_AI_RESPONSE, CONFIG.exitCodes.AI_ERROR);
    } else if (error === "parse_failed") {
        handleError(ERROR_MESSAGES.PARSE_FAILED, CONFIG.exitCodes.AI_ERROR);
    } else if (error) {
        handleError(`Failed to summarize git changes: ${error}`, CONFIG.exitCodes.AI_ERROR);
    }

    if (!commitMessages || commitMessages.length === 0) {
        handleError(ERROR_MESSAGES.NO_SUMMARY_DATA, CONFIG.exitCodes.AI_ERROR);
    }

    if (!stats) {
        handleError(ERROR_MESSAGES.NO_STATS, CONFIG.exitCodes.AI_ERROR);
    }

    return { messages: commitMessages, stats };
}

/**
 * Commits and pushes changes with generated messages.
 * @param commitMessages - Array of commit messages
 * @param stats - Statistics from AI generation
 * @param projectDir - The project directory path
 * @returns The elapsed time in milliseconds
 */
async function commitAndPush(commitMessages: string[], stats: SummaryGitChangesStatsResponse, projectDir: string): Promise<number> {
    const { success, elapsed, error } = await CommitAIService.WriteCommitMessage({ 
        changes: commitMessages, 
        stats, 
        projectDir, 
        showAIWatermark: CONFIG.showAIWatermark 
    });

    if (!success) {
        handleError(`${ERROR_MESSAGES.COMMIT_FAILED}: ${error}`, CONFIG.exitCodes.COMMIT_ERROR);
    }

    return elapsed ?? 0;
}

/**
 * Formats token usage for display.
 * @param stats - Statistics from AI generation
 * @returns Formatted token usage string
 */
function formatTokenUsage(stats: SummaryGitChangesStatsResponse): string {
    const tokenCount = stats.usageMetadata?.totalTokenCount ?? 0;
    return `👍 Wasted ${tokenCount} ${pluralize(tokenCount, "token")}.`;
}

/**
 * Records commit information to the database.
 * @param commitMessages - Array of commit messages
 * @param stats - Statistics from AI generation
 * @param projectDir - The project directory path
 * @param elapsed - Elapsed time in milliseconds
 */
async function recordToDatabase(commitMessages: string[], stats: SummaryGitChangesStatsResponse, projectDir: string, elapsed: number): Promise<void> {
    await DatabaseService.CommitAI.AddSummaryGitChanges({
        changes: commitMessages,
        stats,
        projectDir,
        elapsedMs: elapsed,
    });
}

/**
 * Handles successful commit by notifying user and recording to database.
 * @param commitMessages - Array of commit messages
 * @param stats - Statistics from AI generation
 * @param projectDir - The project directory path
 * @param elapsed - Elapsed time in milliseconds
 */
async function handleSuccessfulCommit(commitMessages: string[], stats: SummaryGitChangesStatsResponse, projectDir: string, elapsed: number): Promise<void> {
    console.log(`[${Tags.System}] Commit message written successfully in ${elapsed}ms.`);
    
    CommitAIService.SendDesktopNotification({ 
        message: formatTokenUsage(stats)
    });

    await recordToDatabase(commitMessages, stats, projectDir, elapsed);
}

/**
 * Main execution function for generating and committing AI-powered commit messages.
 */
async function main(): Promise<void> {
    try {
        console.log(`[${Tags.System}] Generative Commit Message`);
        
        const projectDir = validateEnvironment();
        console.log(`[${Tags.System}] Called From: ${projectDir}`);
        
        const diffContent = await fetchGitDiff(projectDir);
        
        const { messages: commitMessages, stats } = await generateCommitSummary(diffContent, projectDir);
        
        const elapsed = await commitAndPush(commitMessages, stats, projectDir);
        
        await handleSuccessfulCommit(commitMessages, stats, projectDir, elapsed);
        
        process.exit(CONFIG.exitCodes.SUCCESS);
    } catch (error) {
        console.error(`[${Tags.Error}] Unexpected error:`, error);
        process.exit(CONFIG.exitCodes.ENV_ERROR);
    }
}

main();