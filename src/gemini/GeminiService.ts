import { type GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import moment from "moment-timezone";
import CommitAIService from "../commitai/CommitAIService.js";
import { DatabaseService } from "../database/DatabaseService.js";
import { AIPersonality, type GoogleAIModels } from "../types/CommitAITypes.js";
import Tags from "../utils/Tags.js";

interface LoadPromtsProp {
    personality: AIPersonality | "random";
}

interface SummaryGitChangesProp {
    projectDir: string;
    gitDiffMessage: string;
    personality: AIPersonality | "random";
    showWatermark?: boolean;
}

interface SummaryGitChangesResponse {
    data: string[] | null;
    stats?: SummaryGitChangesStatsResponse
    error?: "no_response" | "parse_failed"
}

export interface SummaryGitChangesStatsResponse {
    usageMetadata: GenerateContentResponse["usageMetadata"]
    modelVersion: GenerateContentResponse["modelVersion"]
}

interface LoadPromtsResponse {
    promts: string | null;
    personality: AIPersonality | "random";
}

/**
 * Creates and returns the Gemini AI service with methods for prompt selection and git changes summarization.
 * Initializes Google Gemini AI client with API key from environment variables.
 * @returns {Promise<Object>} Service object with SelectPromt and SummaryGitChanges methods
 */
export async function GeminiService() {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GeminiAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const GEMINI_AI_MODEL: GoogleAIModels = "gemini-2.5-flash" //"gemini-2.5-flash-lite"

    const services = {
        /**
         * Selects a prompt based on the specified AI personality.
         * Supports normal, sarcastic, toxic, tsundere personalities, or random selection.
         * @param {LoadPromtsProp} props - Properties for prompt selection
         * @param {AIPersonality | "random"} props.personality - The AI personality type to use
         * @returns {Promise<LoadPromtsResponse>} Selected prompt text and personality
         */
        async SelectPromt({ personality }: LoadPromtsProp): Promise<LoadPromtsResponse> {
            const promts = (await import("../assets/promts.json")).default
            let selectedPrompt = null

            if (personality == "normal") {
                selectedPrompt = promts["normal_prompt"]
            } else if (personality == "sarcastic") {
                selectedPrompt = promts["sarcastic_prompt"]
            } else if (personality == "toxic") {
                selectedPrompt = promts["toxic_prompt"]
            } else if (personality == "tsundere") {
                selectedPrompt = promts["tsundere_prompt"]
            } else if (personality == "random") {
                const picker = Math.floor(Math.random() * AIPersonality.length)
                const chosen = AIPersonality[picker] ?? "normal"; // fallback to normal
                selectedPrompt = promts[`${chosen}_prompt`]
            } else {
                return { promts: null, personality }
            }

            return { promts: selectedPrompt, personality }
        },

        /**
         * Generates a summary of git changes using Google Gemini AI.
         * Analyzes git diff content with historical context and selected AI personality.
         * Sends request to Gemini API and parses the response into commit messages.
         * @param {SummaryGitChangesProp} props - Properties for summarizing git changes
         * @param {string} props.projectDir - The project directory path
         * @param {string} props.gitDiffMessage - The git diff content to analyze
         * @param {AIPersonality | "random"} props.personality - The AI personality to use
         * @param {boolean} [props.showWatermark=false] - Whether to show AI watermark in output
         * @returns {Promise<SummaryGitChangesResponse>} Array of commit messages and usage statistics
         * @throws {Error} When failed to summarize git changes
         */
        async SummaryGitChanges({ gitDiffMessage, personality, showWatermark = false, projectDir }: SummaryGitChangesProp): Promise<SummaryGitChangesResponse>{
            // Personality Selection
            const { promts: selectedPromt } = await this.SelectPromt({ personality });
            console.log(`[${Tags.AI}] Selected Personality: ${personality}`)

            // Project History Context
            const projectID = await DatabaseService.CommitAI.ResolveProjectDirToID(projectDir)
            const last5Summaries = await DatabaseService.CommitAI.GetLast5SummaryGitChanges(projectID);
            const lastCommit = last5Summaries?.[0]

            const historyContextObj = last5Summaries?.map((item) => {
                const messages = item.messages.map((x) => x.message)
                return `[Changes #${item.index} - ${item.createdAt} ]\n${messages.join("\n")}`
            })

            const diffDateFromLastCommitString = moment(lastCommit?.createdAt).fromNow();
            const latestChanges = lastCommit?.messages

            const historyContextText = `\n[5 Previous commit messages summary history for context]\n\n${historyContextObj.join("\n\n")}\n\n[End of 5 Previous commit messages summary history for context]\n\n`
            const finalPromt = `${selectedPromt}\n\n[Start of git head diff content]\n\n${gitDiffMessage}\n\n[End of git head diff content]\n\n${historyContextText}`

            // Prepare Gemini Instance
            const geminiAIConfig: GenerateContentParameters = {
                model: GEMINI_AI_MODEL,
                contents: finalPromt
            }

            console.log(`[${Tags.AI}] Initialized Google Gemini via API. Using Model: ${geminiAIConfig.model}.`)
            if (showWatermark) console.log(`[${Tags.AI}] Showing AI Watermark in the end of commit message.`);

            // Show last commit messages
            if (latestChanges && latestChanges.length > 0) {
                console.log("")
                console.log(`[${Tags.AI}] Latest Changes on this repository:`)
                
                for (let i = 0; i < latestChanges.length; i++) {
                    const res = latestChanges[i]?.message;

                    if (!res) continue;

                    console.log(`[${Tags.AI}] ${res.replace(/"/g, "")}`)
                }

                console.log(`[${Tags.AI}] Commit${(lastCommit && lastCommit?.messages.length > 1) ? "" : "s"} were made ${diffDateFromLastCommitString}.`)
            }

            console.log("")
            console.log(`[${Tags.AI}] Sending promt.. Waiting for response..`)

            try {
                // Send request to Gemini AI
                const startTime = Date.now()
                const response = await GeminiAI.models.generateContent(geminiAIConfig);
                const endsTime = Date.now()

                console.log(`[${Tags.AI}] Elapsed ${endsTime - startTime}ms.`)

                const res = response?.text
                const usageMetadata = response?.usageMetadata
                const modelVersion = response?.modelVersion

                if (!res) {
                    console.log(`[${Tags.AI}] AI Didn't send any response.`)
                    CommitAIService.SendDesktopNotification({ message: "AI didn't send any response." })
                    return { data: null, error: "no_response" }
                }

                console.log("")

                const cleanedRes = res?.replace("```json", "")?.replace("```", "")

                let data: string[] | null = null
                try {
                    data = JSON?.parse(cleanedRes)
                } catch (e) {
                    console.log(`[${Tags.Error}] Failed to parse AI response as JSON.`)
                    console.error(e)
                    return { data: null, error: "parse_failed" }
                }

                if (!data || data.length == 0) {
                    console.log(`[${Tags.AI}] AI response is empty or not an array.`)
                    console.log(data)
                    CommitAIService.SendDesktopNotification({ message: "AI response is empty or not an array. Please check the logs for more details." })
                    return { data: null, error: "no_response" }
                }

                console.log(`[${Tags.AI}] Cleaned Response:`)

                for (let i = 0; i < data.length; i++) {
                    const res = data[i];

                    if (!res) continue;

                    console.log(`[${Tags.AI}] ${res.replace(/"/g, "")}`)
                }

                console.log("")

                return { data, stats: { modelVersion, usageMetadata } }
            } catch (e) {
                throw new Error("Failed to summarize git changes: " + e);
            }
        }
    }

    return services
}