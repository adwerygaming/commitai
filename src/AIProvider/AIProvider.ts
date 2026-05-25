import { OpenAI } from "openai";
import { type ChatModel, type CompletionUsage } from "openai/resources";
import Tags from "../utils/Tags.js";
import { env } from "../utils/EnvManager.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

interface GenerateProp {
    userPrompt: string
    systemPrompt: string
    modelToUse?: string
}

interface GenerateResult {
    content: string[]
    usageMetadata?: CompletionUsage
    model?: ChatModel | string
}

export class AIProvider {
    private sanitizeResponse(dirtyResponse: string): string {
        const sanitized = dirtyResponse?.replace("```json", "")?.replace("```", "")
        return sanitized
    }

    async generate({ systemPrompt, userPrompt, modelToUse }: GenerateProp): Promise<GenerateResult> {
        const client = new OpenAI({
            baseURL: env.MASDEPAN_PROXY_BASEURL,
            apiKey: env.MASDEPAN_PROXY_APIKEY
        });

        console.log(`[${Tags.AI}] Sending to Proxy...`)

        try {
            const startTime = Date.now()
            const res =  await client.chat.completions.create({
                model: modelToUse ?? "auto",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: userPrompt,
                    },
                ],
            });
            const endTime = Date.now()

            const aiResponse = res.choices[0]?.message?.content ?? null
            const usageMetadata = res.usage
            const model = res.model

            const elapsedMs = endTime - startTime
            const elapsedSecs = elapsedMs / 1000

            console.log(`[${Tags.AI}] Model ${model} was used.`)
            console.log(`[${Tags.AI}] Elapsed: ${elapsedSecs}s (${elapsedMs}ms)`)

            if (!aiResponse) {
                console.log(`[${Tags.AI}] AI Didn't give any response. Likely rate limited or something.`)
                return { content: [] }
            }

            const sanitizedContent = this.sanitizeResponse(aiResponse)
            const parsedContent = JSON.parse(sanitizedContent) as string[]

            console.log(`[${Tags.AI}] Parsed AI Contents: ${parsedContent?.length ?? 0} change${parsedContent?.length > 1 ? "s" : ""}`)

            return {
                content: parsedContent,
                usageMetadata,
                model,
            }
        } catch (e) {
            console.log(`[${Tags.Error}] Generate Error.`)
            console.error(e)
            return { content: [] }
        }
    }
}