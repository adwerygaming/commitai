import { DatabaseService } from "../database/DatabaseService";
import { GeminiService } from "../gemini/GeminiService";
import type { AIPersonality } from "../types/CommitAITypes";
import Tags from "../utils/Tags";
import { CommitAIService } from "./CommitAIService";

// Configuration
const SummaryPersonality: AIPersonality = "normal"
const showAIWatermark = false

const callerPath = process.env.CALL_FROM

if (!callerPath) {
    console.log(`[${Tags.Error}] No project directory found. Please run using the .sh file.`);
    process.exit(1);
}

console.log(`[${Tags.System}] Generative Commit Message`)
console.log(`[${Tags.System}] Called From: ${callerPath}`)

const { data: repoDiffContent, error: repoDiffContentError } = await CommitAIService().GetRepoDiffContent({ projectDir: callerPath })

if (repoDiffContentError) {
    if (repoDiffContentError === "not_in_repository") {
        console.log(`[${Tags.Error}] Not in a git repository. Please run this command inside a git repository.`);
    } else {
        console.log(`[${Tags.Error}] Failed to get git diff content: ${repoDiffContentError}`);
    }
    process.exit(1);
}

if (!repoDiffContent || repoDiffContent.length === 0) {
    console.log(`[${Tags.Error}] No changes found in the repository.`);
    process.exit(1);
}

console.log(`[${Tags.System}] Found ${repoDiffContent.length} line${repoDiffContent.length > 1 ? "s" : ""} of changes.`);

const { data: summaryData, error: summaryError, stats: summaryStats } = await (await GeminiService()).SummaryGitChanges({ gitDiffMessage: repoDiffContent, personality: SummaryPersonality, projectDir: callerPath, showWatermark: showAIWatermark });

if (summaryError) {
    if (summaryError === "no_response") {
        console.log(`[${Tags.Error}] No response from AI.`);
    } else if (summaryError === "parse_failed") {
        console.log(`[${Tags.Error}] Failed to parse AI response.`);
    } else {
        console.log(`[${Tags.Error}] Failed to summarize git changes: ${summaryError}`);
    }
    process.exit(1)
}

if (!summaryData || summaryData.length === 0) {
    console.log(`[${Tags.Error}] No summary data received from AI.`);
    process.exit(1);
}

if (!summaryStats) {
    console.log(`[${Tags.Error}] No stats received from AI.`);
    process.exit(1);
}

const { success, elapsed, error } = await CommitAIService().WriteCommitMessage({ changes: summaryData, stats: summaryStats, projectDir: callerPath, showAIWatermark });

if (success) {
    console.log(`[${Tags.System}] Commit message written successfully in ${elapsed}ms.`);
    CommitAIService().SendDesktopNotification({ message: `👍. Wasted ${summaryStats.usageMetadata?.totalTokenCount ?? 0} tokens.` })

    // Add to database
    await DatabaseService.CommitAI.AddSummaryGitChanges({
        changes: summaryData,
        stats: summaryStats,
        projectDir: callerPath,
        elapsedMs: elapsed ?? 0,
    })
} else {
    console.log(`[${Tags.Error}] Failed to write commit message: ${error}`);
    process.exit(1);
}