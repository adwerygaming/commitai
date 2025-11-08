import { type GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { CommitAIService } from "../commitai/CommitAIService.js";
import { AIPersonality, type GoogleAIModels } from "../types/CommitAITypes.js";
import Tags from "../utils/Tags.js";
import moment from "moment-timezone";

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


export async function GeminiService() {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GeminiAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const GEMINI_AI_MODEL: GoogleAIModels = "gemini-2.5-flash-lite"

    const services = {
        LoadPromts: async ({ personality }: LoadPromtsProp) => {
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
        SummaryGitChanges: async ({ gitDiffMessage, personality, showWatermark = false, projectDir }: SummaryGitChangesProp): Promise<SummaryGitChangesResponse> => {
            console.log(`[${Tags.AI}] Selected Personality: ${personality}`)

            const { promts: selectedPromt } = await services.LoadPromts({ personality });

            const last5Summaries = await CommitAIService().Database.GetLast5SummaryGitChanges(projectDir);
            const lastCommit = last5Summaries?.[0]

            const historyContextObj = last5Summaries?.map((item, index) => {
                return `[Changes #${index}] ${item.changes.join("\n")}\n`
            })

            const historyContextText = `\n[Previous commit messages summary history]\n${historyContextObj.join("\n")}\n[End of previous commit messages summary history]\n\n`

            const finalPromt = `${selectedPromt}\n[Start of git head diff content]\n\n${gitDiffMessage}\n\n[End of git head diff content]\n${historyContextText}`

            const geminiAIConfig: GenerateContentParameters = {
                model: GEMINI_AI_MODEL,
                contents: finalPromt
            }

            console.log(`[${Tags.AI}] Initialized Google Gemini via API. Using Model: ${geminiAIConfig.model}.`)

            if (showWatermark) {
                console.log(`[${Tags.AI}] Showing AI Watermark in the end of commit message.`)
            }

            console.log(`[${Tags.AI}] Sending promt.. Waiting for response..`)

            const diffDate = moment(lastCommit?.timestamp).fromNow();
            const latestChanges = lastCommit?.changes

            if (latestChanges && latestChanges.length > 0) {
                console.log("")
                console.log(`[${Tags.AI}] Latest Changes on this repository:`)
                for (let i = 0; i < latestChanges.length; i++) {
                    const res = latestChanges[i];

                    if (!res) continue;

                    console.log(`[${Tags.AI}] ${res.replace(/"/g, "")}`)
                }
                console.log(lastCommit?.changes.join("\n") ?? "No previous summaries found.")
                console.log(`[${Tags.AI}] Commit${(lastCommit && lastCommit?.changes.length > 1) ? "" : "s"} were made ${diffDate}.`)
            }

            const startTime = Date.now()
            const response = await GeminiAI.models.generateContent(geminiAIConfig);

            const res = response?.text
            const usageMetadata = response?.usageMetadata
            const modelVersion = response?.modelVersion

            if (!res) {
                console.log(`[${Tags.AI}] AI Didn't send any response.`)
                CommitAIService().SendDesktopNotification({ message: "AI didn't send any response." })
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
                CommitAIService().SendDesktopNotification({ message: "AI response is empty or not an array. Please check the logs for more details." })
                return { data: null, error: "no_response" }
            }

            console.log(`[${Tags.AI}] Cleaned Response:`)

            for (let i = 0; i < data.length; i++) {
                const res = data[i];

                if (!res) continue;
                
                console.log(`[${Tags.AI}] ${res.replace(/"/g, "")}`)
            }

            console.log("")

            const endsTime = Date.now()
            console.log(`[${Tags.AI}] Elapsed ${endsTime - startTime}ms.`)

            return { data, stats: { modelVersion, usageMetadata} }
        }
    }

    return services
} 