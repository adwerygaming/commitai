import type { SummaryGitChangesStatsResponse } from "../gemini/GeminiService";
import Tags from "../utils/Tags";
import DatabaseClient from "./Client";

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

export const DatabaseService = {
    CommitAI: {
        ResolveProjectDirToKey: (projectDir: string) => {
            // replaces:
            // - any spaces
            // - any special characters
            // - any periods
            // to underscores
            return projectDir.replace(/[\s\W.]+/g, "_");
        },
        GetCurrentChangesNumber: async (projectDir: string) => {
            const projectPath = DatabaseService.CommitAI.ResolveProjectDirToKey(projectDir)

            const record = await DatabaseClient.projectCommits.findUnique({ where: { projectPath }, include: { commits: true } })
            const currentChangesNumber = record?.commits.length ?? 0
            const newChangesNumber = currentChangesNumber + 1

            return { newChangesNumber, currentChangesNumber }
        },
        AddSummaryGitChanges: async ({ changes, elapsedMs, projectDir, stats }: DatabaseAddSummaryGitChangesProp) => {
            const projectPath = DatabaseService.CommitAI.ResolveProjectDirToKey(projectDir)

            if (changes.length == 0) {
                return false
            }

            const { newChangesNumber: changesNumber } = await DatabaseService.CommitAI.GetCurrentChangesNumber(projectDir)
            const timestamp = new Date().toISOString()

            console.log("")
            console.log(`[${Tags.Debug}] Adding summary git changes to database.`)
            console.log(`[${Tags.Debug}] Project Path       : ${projectPath}`)
            console.log(`[${Tags.Debug}] Changes Contents   : ${changes.length} line${changes.length > 1 ? "s" : ""}`)
            console.log(`[${Tags.Debug}] Changes Number     : #${changesNumber}`)
            console.log(`[${Tags.Debug}] Elapsed Time       : ${elapsedMs}ms`)
            console.log(`[${Tags.Debug}] Timestamp          : ${timestamp}`)
            console.log("")

            const res = await DatabaseClient.commitData.create({
                data: {
                    elapsedMs,
                    timestamp,
                    changes: {
                        create: {
                            changesNumber
                        }
                    },
                    stats: {
                        create: {
                            modelVersion: stats.modelVersion ?? "unknown",
                            usageMetadata: {
                                create: {
                                    promptTokenCount: stats.usageMetadata?.promptTokenCount ?? 0,
                                    candidatesTokenCount: stats.usageMetadata?.candidatesTokenCount ?? 0,
                                    totalTokenCount: stats.usageMetadata?.totalTokenCount ?? 0,
                                }
                            }
                        }
                    }
                }
            })

            for (const change of changes) {
                await DatabaseClient.commitData.update({
                    data: {
                        changes: {
                            create: {
                                changeMessage: change
                            }
                        }
                    },
                    where: {
                        id: res.id
                    }
                })
            }
        },
        GetLatestSummaryGitChanges: async (projectDir: string) => {
            const projectPath = DatabaseService.CommitAI.ResolveProjectDirToKey(projectDir)

            const record = await DatabaseClient.projectCommits.findMany({
                where: { projectPath },
                include: {
                    commits: {
                        include: {
                            stats: {
                                include: {
                                    usageMetadata: true
                                }
                            }
                        }
                    }
                }
            }).then(res => res.flatMap(item => item.commits))

            return record?.reverse()?.[0] ?? null
        },
        GetAllSummaryGitChanges: async () => {
            const allData = await DatabaseClient.projectCommits.findMany({
                include: {
                    commits: true
                }
            })
            return allData.map(item => ({
                projectPath: item.projectPath,
                data: item.commits
            }))
        },
        GetLast5SummaryGitChanges: async (projectDir: string) => {
            const projectPath = DatabaseService.CommitAI.ResolveProjectDirToKey(projectDir)

            const allData = await DatabaseService.CommitAI.GetAllSummaryGitChanges()
            const filteredData = allData.filter(item => item.projectPath === projectPath).flatMap(item => item.data)
            const last5 = filteredData.reverse().slice(0, 5)

            return last5
        }
    }
}