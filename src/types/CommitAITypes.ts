// https://ai.google.dev/gemini-api/docs
export type GoogleAIModels = "gemini-2.5-flash-lite" | "gemini-2.5-flash" | "gemini-2.5-pro"

export interface GetDiffContentProp {
    error: "not_in_repository",
    data: string
}