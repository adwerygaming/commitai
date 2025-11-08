import { execSync } from "child_process";
import humanNumber from "human-number";
import notifier from 'node-notifier';
import DatabaseClient from "../database/Client.js";
import { type SummaryGitChangesStatsResponse } from "../gemini/GeminiService.js";
import Tags from "../utils/Tags.js";

interface GetRepoDiffContentProp {
    projectDir: string;
}

export interface GetRepoDiffContentResponse {
    data: string | null;
    error?: "not_in_repository";
}

interface SendNotificationProp {
    message: string
    timeout?: number
}

interface WriteCommitMessageProp {
    projectDir: string;
    changes: string[]
    stats: SummaryGitChangesStatsResponse
    showAIWatermark?: boolean
}

interface WriteCommitMessageResponse {
    success: boolean;
    elapsed?: number
    error?: "execute_failed"
}

interface SummaryGitSummaryRecord {
    changesNumber: number,
    changes: string[],
    stats: SummaryGitChangesStatsResponse,
    elapsedMs: number,
    timestamp: Date | string
}

interface DatabaseAddSummaryGitChangesProp extends Omit<SummaryGitSummaryRecord, "timestamp" | "changesNumber"> {
    projectDir: string
}


export function CommitAIService() {
    const services = {
        Database: {
            ResolveProjectDirToKey: (projectDir: string) => {
                // replaces:
                // - any spaces
                // - any special characters
                // - any periods
                // to underscores
                return projectDir.replace(/[\s\W.]+/g, "_");
            },
            GetCurrentChangesNumber: async (projectDir: string) => {
                const key = services.Database.ResolveProjectDirToKey(projectDir)

                const record = await DatabaseClient.get<SummaryGitSummaryRecord[]>(key)
                const currentChangesNumber = record?.length ?? 0
                const newChangesNumber = currentChangesNumber + 1

                return { newChangesNumber, currentChangesNumber }
            },
            AddSummaryGitChanges: async ({ changes, elapsedMs, projectDir, stats }: DatabaseAddSummaryGitChangesProp) => {
                const key = services.Database.ResolveProjectDirToKey(projectDir)

                if (changes.length == 0) {
                    return false
                }

                const { newChangesNumber: changesNumber } = await services.Database.GetCurrentChangesNumber(projectDir)

                const record: SummaryGitSummaryRecord = {
                    changesNumber,
                    changes,
                    stats,
                    elapsedMs,
                    timestamp: new Date().toISOString()
                }

                console.log("")
                console.log(`[${Tags.Debug}] Adding summary git changes to database.`)
                console.log(`[${Tags.Debug}] Key record         : ${key}`)
                console.log(`[${Tags.Debug}] Changes Contents   : ${changes.length} line${changes.length > 1 ? "s" : ""}`)
                console.log(`[${Tags.Debug}] Changes Number     : #${changesNumber}`)
                console.log(`[${Tags.Debug}] Elapsed Time       : ${elapsedMs}ms`)
                console.log(`[${Tags.Debug}] Timestamp          : ${record.timestamp}`)
                console.log("")

                await DatabaseClient.push<SummaryGitSummaryRecord>(key, record)
                return true
            },
            GetLatestSummaryGitChanges: async (projectDir: string) => {
                const key = services.Database.ResolveProjectDirToKey(projectDir)

                const record = await DatabaseClient.get<SummaryGitSummaryRecord[]>(key)
                return record?.reverse()?.[0] ?? null
            },
            GetAllSummaryGitChanges: async () => {
                const allData = await DatabaseClient.all<SummaryGitSummaryRecord[]>()
                return allData.map(item => ({
                    projectKey: item.id,
                    data: item.value
                }))
            },
            GetLast5SummaryGitChanges: async (projectDir: string) => {
                const key = services.Database.ResolveProjectDirToKey(projectDir)

                const allData = await services.Database.GetAllSummaryGitChanges()
                const filteredData = allData.filter(item => item.projectKey === key).flatMap(item => item.data)
                const last5 = filteredData.reverse().slice(0, 5)

                return last5
            }
        },
        SendDesktopNotification: ({ message, timeout }: SendNotificationProp) => {
            notifier.notify({
                title: 'CommitAI',
                message,
                sound: true,
                wait: true,
                timeout: timeout ?? 5
            });
        },
        GetRepoDiffContent: async ({ projectDir }: GetRepoDiffContentProp): Promise<GetRepoDiffContentResponse> => {
            let data = null

            try {
                data = execSync("git diff HEAD", {
                    cwd: projectDir,
                    stdio: "pipe",
                    encoding: "utf-8",
                });
            } catch (e: any) {
                const msg = e?.message as string
                if (msg.includes("Not a git repository")) {
                    return { data: null, error: "not_in_repository" }
                }
            }

            return { data }
        },
        WriteCommitMessage: async ({ projectDir, changes, stats, showAIWatermark }: WriteCommitMessageProp): Promise<WriteCommitMessageResponse> => {
            if (!changes || changes.length == 0) {
                console.log(`[${Tags.Git}] Didn't receive string array of changes.`)
                return { success: false, elapsed: 0 }
            }

            const startTime = Date.now()

            let changesMessages = ""
            const title = changes[0]

            for (let i = 1; i < changes.length; i++) {
                const msg = changes[i];
                changesMessages += `${msg}\n`
            }

            const { modelVersion, usageMetadata } = stats
            const totalTokenRaw = usageMetadata?.totalTokenCount ?? 0
            const totalTokenFormatted = humanNumber(totalTokenRaw)

            if (showAIWatermark) changesMessages += `✨ Automatically Generated by Google Gemini (${modelVersion ?? "Unknown Model"}, wasted ${totalTokenFormatted} tokens)`

            const commands = [
                "git add .",
                "git commit " + `-m "${title}" -m "${changesMessages}"`,
                "git push"
            ]

            // exec on callerPath
            for (let i = 0; i < commands.length; i++) {
                const res = commands[i];

                if (!res) continue;

                try {
                    console.log(`[${Tags.Git}] Running: ${res}`)
                    execSync(res, { cwd: projectDir, stdio: "inherit" });
                } catch (e) {
                    console.log(`[${Tags.Error}] Failed to run git command [${res}]`)
                    console.error(e)
                    return { success: false, error: "execute_failed" }
                }
            }

            const endTime = Date.now()
            const elapsed = endTime - startTime
            return { success: true, elapsed}
        }
    }

    return services
}