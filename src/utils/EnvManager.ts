import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import Tags from "./Tags.js";

// Schema for .env file,
// Make sure to sync this.
// Default value are: z.string()
const envSchema = z.object({
    NODE_ENV: z.enum(["PROD", "DEV"]).optional(),

    DB_HOST: z.string(),
    DB_PORT: z.string(),
    DB_USER: z.string(),
    DB_NAME: z.string(),
    DB_PASSWORD: z.string(),

    GEMINI_API_KEY: z.string(),
    
    MASDEPAN_PROXY_APIKEY: z.string(),
    MASDEPAN_PROXY_BASEURL: z.string()
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// assume that the EnvManager is at src/utils
config({ path: resolve(__dirname, "../../.env") });

const envParsed = envSchema.safeParse(process.env)

if (envParsed.error || Object.keys(envParsed?.data ?? {}).length == 0) {
    console.log(`[${Tags.Error}] Invalid Env Variable.`)
    console.log(envParsed.error)
    throw new Error(`.env not satisfied`)
}

if (envParsed.success) {
    console.log(`[${Tags.System}] Env check success.`)
}

export const env = envParsed.data