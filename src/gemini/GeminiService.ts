import { type GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import axios from "axios";
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
    diffContent: string;
    personality: AIPersonality | "random";
    showWatermark?: boolean;
    context?: string;
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

interface SendRequestProps {
    useProxy: boolean,
    promt: string,
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

    // Proxy Setup
    const proxyUrl = process.env.PROXY_BASEURL
    const proxyApiKey = process.env.PROXY_APIKEY
    const useProxy = true;

    const services = {
        async sendRequest({ useProxy, promt }: SendRequestProps) {
            // Prepare Gemini Instance
            const requestConfig: GenerateContentParameters = {
                model: GEMINI_AI_MODEL,
                contents: promt
            }

            if (!useProxy) {
                // google
                const response = await GeminiAI.models.generateContent(requestConfig)
                return response
            } else {
                // proxy
                console.log(`[${Tags.System}] Using proxy for Gemini API request.`)
                
                if (!proxyUrl || !proxyApiKey) {
                    throw new Error("Proxy URL or API Key is not set in environment variables.")
                }
                
                const { data } = await axios.post(`${proxyUrl}/generate/text`, {
                    contents: promt,
                }, {
                    headers: {
                        "x-api-key": proxyApiKey
                    },
                    validateStatus: () => true
                })

                const res = data?.data?.data

                if (!res) {
                    return null
                } 

                const output = {
                    text: res?.content ?? null,
                    usageMetadata: res?.metadata,
                    modelVersion: res?.metadata?.model
                }

                return output
            }
        },

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
         * @param {string} props.diffContent - The git diff content to analyze
         * @param {AIPersonality | "random"} props.personality - The AI personality to use
         * @param {boolean} [props.showWatermark=false] - Whether to show AI watermark in output
         * @returns {Promise<SummaryGitChangesResponse>} Array of commit messages and usage statistics
         * @throws {Error} When failed to summarize git changes
         */
        async SummaryGitChanges({ diffContent, personality, showWatermark = false, projectDir, context }: SummaryGitChangesProp): Promise<SummaryGitChangesResponse>{
            // Personality Selection
            const { promts: selectedPrompt } = await this.SelectPromt({ personality });
            console.log(`[${Tags.AI}] Selected Personality: ${personality}`)

            // Project History Context
            const projectID = await DatabaseService.CommitAI.ResolveProjectDirToID(projectDir)
            const recentCommits = await DatabaseService.CommitAI.GetLast5SummaryGitChanges(projectID);
            const latestCommit = recentCommits?.[0]

            const formattedCommitHistory = recentCommits?.map((item) => {
                const messages = item.messages.map((x) => x.message)
                return `[Changes #${item.index} - ${item.createdAt} ]\n${messages.join("\n")}`
            })

            const timeSinceLastCommit = moment(latestCommit?.createdAt).fromNow();
            const latestCommitMessages = latestCommit?.messages

            const historyPromptSection = `\n[5 Previous commit messages summary history for context]\n\n${formattedCommitHistory.join("\n\n")}\n\n[End of 5 Previous commit messages summary history for context]`
            const contextSection = context ? `[Start User Context]\nThe user provided context. Please pay attention to this context: ${context}\n[End for User Context]` : "";
            const finalPrompt = `${selectedPrompt}\n\n${contextSection}\n\n[Start of git head diff content]\n\n${diffContent}\n\n[End of git head diff content]\n\n${historyPromptSection}`

            console.log(finalPrompt)

            // Prepare Gemini Instance
            const requestConfig: GenerateContentParameters = {
                model: GEMINI_AI_MODEL,
                contents: finalPrompt
            }

            console.log(`[${Tags.AI}] Initialized Google Gemini via API. Using Model: ${requestConfig.model}.`)
            if (showWatermark) console.log(`[${Tags.AI}] Showing AI Watermark in the end of commit message.`);

            // Show last commit messages
            if (latestCommitMessages && latestCommitMessages.length > 0) {
                console.log("")
                console.log(`[${Tags.AI}] Latest Changes on this repository:`)
                
                for (let i = 0; i < latestCommitMessages.length; i++) {
                    const message = latestCommitMessages[i]?.message;

                    if (!message) continue;

                    console.log(`[${Tags.AI}] ${message.replace(/"/g, "")}`)
                }

                console.log(`[${Tags.AI}] Commit${(latestCommit && latestCommit?.messages.length > 1) ? "" : "s"} were made ${timeSinceLastCommit}.`)
            }

            console.log("")
            console.log(`[${Tags.AI}] Sending promt.. Waiting for response..`)

            try {
                // Send request to Gemini AI
                const startTime = Date.now()
                const response = await this.sendRequest({ useProxy, promt: finalPrompt })
                const endTime = Date.now()

                console.log(`[${Tags.AI}] Elapsed ${endTime - startTime}ms.`)

                const responseText = response?.text
                const usageMetadata = response?.usageMetadata
                const modelVersion = response?.modelVersion

                if (!responseText) {
                    console.log(`[${Tags.AI}] AI Didn't send any response.`)
                    CommitAIService.SendDesktopNotification({ message: "AI didn't send any response." })
                    return { data: null, error: "no_response" }
                }

                console.log("")

                const sanitizedResponse = responseText?.replace("```json", "")?.replace("```", "")

                let commitMessages: string[] | null = null

                try {
                    commitMessages = JSON?.parse(sanitizedResponse)
                } catch (e) {
                    console.log(`[${Tags.Error}] Failed to parse AI response as JSON.`)
                    console.error(e)
                    return { data: null, error: "parse_failed" }
                }

                if (!commitMessages || commitMessages.length == 0) {
                    console.log(`[${Tags.AI}] AI response is empty or not an array.`)
                    console.log(commitMessages)
                    CommitAIService.SendDesktopNotification({ message: "AI response is empty or not an array. Please check the logs for more details." })
                    return { data: null, error: "no_response" }
                }

                console.log(`[${Tags.AI}] Cleaned Response:`)

                for (let i = 0; i < commitMessages.length; i++) {
                    const message = commitMessages[i];

                    if (!message) continue;

                    console.log(`[${Tags.AI}] ${message.replace(/"/g, "")}`)
                }

                console.log("")

                return { data: commitMessages, stats: { modelVersion, usageMetadata } }
            } catch (e) {
                throw new Error("Failed to summarize git changes: " + e);
            }
        }
    }

    return services
}