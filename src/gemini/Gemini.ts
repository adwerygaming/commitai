import { GenerateContentParameters, GenerateContentResponseUsageMetadata, GoogleGenAI } from "@google/genai";
import axios from "axios";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../utils/EnvManager.js";
import Tags from "../utils/Tags.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GenerateSwitchProp {
    content: string,
    projectContext?: string | null
    additionalContext?: string | null
    model?: string,
    useProxy?: boolean
    // showWatermark?: boolean
}

interface UnionGenerateProp {
    finalPrompt: string
    systemPrompt: string
}

type GenerateGeminiProp = UnionGenerateProp & {
    model: string
}
type GenerateProxyProp = UnionGenerateProp

interface GenerateResult {
    content: string[]
    usageMetadata?: Partial<GenerateContentResponseUsageMetadata>
}

export class Gemini {
    private async fetchSystemPromt(): Promise<string> {
        const assetsPath = path.join(__dirname, "..", "assets")
        const systemPromtPath = path.join(assetsPath, "systemPromt.txt")
        const systemPromt = await fs.readFile(systemPromtPath, "utf-8")
        return systemPromt
    }

    private async createClient(apiKey?: string): Promise<GoogleGenAI> {
        const client = new GoogleGenAI({ apiKey: apiKey ?? env.GEMINI_API_KEY });
        return client
    }

    private sanitizeResponse(dirtyResponse: string): string {
        const sanitized = dirtyResponse?.replace("```json", "")?.replace("```", "")
        return sanitized
    }

    async generate({ useProxy, content, additionalContext, model, projectContext }: GenerateSwitchProp): Promise<GenerateResult> {
        const GIT_DIFF_CHAR_LIMIT = 98000
        if (content.length > GIT_DIFF_CHAR_LIMIT) {
            content = content.slice(0, GIT_DIFF_CHAR_LIMIT) + "... [truncated]"
        }
        // handle promthing
        const systemPrompt = await this.fetchSystemPromt()
        const projectContexts = `Project Context: ${projectContext}`
        const userContext = `User Context about this changes:\n[Start of User Context]\n${additionalContext}\n[End of User Context]`
        const gitDiffContent = `[Start of Git Changes]\n${content}\n[End of Git Changes]`
        const finalPrompt = [
            projectContext ? projectContexts : null,
            additionalContext ? userContext : null,
            gitDiffContent
        ].filter(Boolean).join("\n")

        if (useProxy) {
            return await this.generateUsingProxy({
                finalPrompt,
                systemPrompt
            })
        } else {
            return await this.generateUsingGemini({
                finalPrompt,
                systemPrompt,
                model: model ?? "gemini-2.5-flash"
            })
        }
    }

    private async generateUsingProxy({ finalPrompt, systemPrompt }: GenerateProxyProp): Promise<GenerateResult> {
        console.log(`[${Tags.AI}] Generating using MasDepan's Proxy.`)
        console.log("")

        const PROXY_APIKEY = env.MASDEPAN_PROXY_APIKEY
        const PROXY_BASEURL = env.MASDEPAN_PROXY_BASEURL
        const PROXY_URL = `${PROXY_BASEURL}/generate/text`

        try {
            console.log(`[${Tags.AI}] Sending to MasDepan's Proxy...`)

            const startTime = Date.now()
            const { data, status, statusText } = await axios.post(PROXY_URL, {
                contents: [systemPrompt, finalPrompt].join("\n"),
            }, {
                headers: {
                    "x-api-key": PROXY_APIKEY
                },
                validateStatus: () => true
            })
            const endTime = Date.now()

            const elapsedMs = endTime - startTime
            const elapsedSecs = elapsedMs / 1000

            console.log(`[${Tags.AI}] Elapsed: ${elapsedSecs}s (${elapsedMs}ms)`)

            if (status != 201) {
                console.log(`[${Tags.AI}] Proxy server didn't return success response. Instead got ${status} (${statusText})`)
                return { content: [] }
            }

            const res = data?.data?.data
            const aiResponse = res.content

            if (!aiResponse) {
                console.log(`[${Tags.AI}] AI Didn't give any response. Likely rate limited or something.`)
                return { content: [] }
            }

            const sanitizedResponse = this.sanitizeResponse(aiResponse)

            const parsedContent = JSON.parse(sanitizedResponse) as string[]

            console.log(`[${Tags.AI}] Parsed AI Contents: ${parsedContent?.length ?? 0} change${parsedContent?.length > 1 ? "s" : ""}`)

            return {
                content: parsedContent
            }
        } catch (e) {
            console.log(`[${Tags.Error}] Generate Error.`)
            console.error(e)
            return { content: [] }
        }
    }

    private async generateUsingGemini({ systemPrompt, finalPrompt, model }: GenerateGeminiProp): Promise<GenerateResult> {
        console.log(`[${Tags.AI}] Generating using Google Gemini.`)
        console.log("")

        const client = await this.createClient()

        console.log(`[${Tags.AI}] Generating using model: ${model}`)
        const generateConfig: GenerateContentParameters = {
            model,
            contents: finalPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 25
                }
            }
        }

        const { totalTokens } = await client.models.countTokens({
            model: generateConfig.model,
            contents: generateConfig.contents
        })

        console.log(`[${Tags.AI}] This commit generation will cost around ${totalTokens} tokens.`)
        console.log(`[${Tags.AI}] Sending to Google Gemini...`)

        try {
            const startTime = Date.now()
            const res = await client.models.generateContent(generateConfig);
            const endTime = Date.now()

            const aiResponse = res.text
            const usageMetadata = res.usageMetadata
            const elapsedMs = endTime - startTime
            const elapsedSecs = elapsedMs / 1000

            console.log(`[${Tags.AI}] Elapsed: ${elapsedSecs}s (${elapsedMs}ms)`)

            // possibly bcs of rate limited, if only using 1 account.
            if (!aiResponse) {
                console.log(`[${Tags.AI}] AI Didn't give any response. Likely rate limited or something.`)
                return { content: [] }
            }

            const parsedContent = JSON.parse(aiResponse) as string[]

            console.log(`[${Tags.AI}] Parsed AI Contents: ${parsedContent?.length ?? 0} change${parsedContent?.length > 1 ? "s" : ""}`)

            return {
                content: parsedContent,
                usageMetadata
            }
        } catch (e) {
            console.log(`[${Tags.Error}] Generate Error.`)
            console.error(e)
            return { content: [] }
        }
    }
}