import { GenerateContentResponse } from "@google/genai"

// https://ai.google.dev/gemini-api/docs
export type GoogleAIModels = "gemini-2.5-flash-lite" | "gemini-2.5-flash" | "gemini-2.5-pro"

export const AIPersonality = [
    "normal",
    "tsundere",
    "toxic",
    "sarcastic"
] as const

export type AIPersonality = typeof AIPersonality[keyof typeof AIPersonality]
type AIPersonalityInput = AIPersonality | "random"

export interface GetDiffContentProp {
    error: "not_in_repository",
    data: string
}

export interface SummaryWithAIProp {
    gitDiffMessage: string
    personality: AIPersonalityInput
}

export interface SummaryWithAIResponse {
    data: string[],
    response: GenerateContentResponse | null
}

export interface WriteCommitMessageProp {
    changes: string[]
    response?: GenerateContentResponse | null
}

export interface GetDiffContentResponse {
    data: string | null
    error?: "not_in_repository"
}