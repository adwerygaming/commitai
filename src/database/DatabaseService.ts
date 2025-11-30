import fs from "fs";
import path from "path";
import { CommitAIService } from "../commitai/CommitAIService";
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
        ResolveProjectDirToID: async (projectDir: string) => {
            const commitAIIdentifierFIle = path.join(projectDir, ".commitai");
            const checkIdentifierFile = fs.existsSync(commitAIIdentifierFIle)

            if (!checkIdentifierFile) {
                console.log(`[${Tags.System}] No CommitAI Identifier on ${projectDir}. Creating new one...`)
                const createIdentifierFile = await CommitAIService().CreateIdentifierFile(projectDir)
                if (!createIdentifierFile) {
                    throw new Error("Failed to create project identifier file.")
                }
            }

            const identifierFile = fs.readFileSync(commitAIIdentifierFIle, "utf-8").trim() // should be uuid
            console.log(`[${Tags.Debug}] UUID: ${identifierFile}`)
            return identifierFile
        },
        GetCurrentChangesNumber: async (projectID: string) => {
            // get by commit id
            const record = await DatabaseClient.project.findUnique({
                where: {
                    commitAIIdentifier: projectID
                },
                include: {
                    commits: true
                }
            })

            const currentChangesNumber = record?.commits.length ?? 0
            const newChangesNumber = currentChangesNumber + 1

            return { newChangesNumber, currentChangesNumber }
        },
        AddSummaryGitChanges: async ({ changes, elapsedMs, projectDir, stats }: DatabaseAddSummaryGitChangesProp) => {
            const projectID = await DatabaseService.CommitAI.ResolveProjectDirToID(projectDir)

            if (changes.length == 0) {
                return false
            }

            const { newChangesNumber: changesNumber } = await DatabaseService.CommitAI.GetCurrentChangesNumber(projectID)
            const timestamp = new Date().toISOString()

            // changes is 1 line of commit changes, 1 commit can have multiple change messages
            const project = await DatabaseClient.project.upsert({
                where: { commitAIIdentifier: projectID },
                create: {
                    commitAIIdentifier: projectID,
                    projectPath: projectDir
                },
                update: {
                    commitAIIdentifier: projectID,
                }
            })

            const packedCommitMessages = changes.map((x) => ({ message: x }))

            const packedStatistics = {
                modelVersion: stats?.modelVersion ?? "unknown",
                promptTokenCount: BigInt(stats?.usageMetadata?.promptTokenCount ?? 0),
                candidatesTokenCount: BigInt(stats?.usageMetadata?.candidatesTokenCount ?? 0),
                totalTokenCount: BigInt(stats?.usageMetadata?.totalTokenCount ?? 0),
                tokenCount: BigInt(stats?.usageMetadata?.totalTokenCount ?? 0),
                modality: "none"
            }

            const createCommitInfo = await DatabaseClient.$transaction(async (p) => {
                return p.commitInfo.create({
                    data: {
                        statistics: {
                            create: packedStatistics
                        },
                        commitMessages: {
                            create: packedCommitMessages
                        },
                        project: {
                            connect: {
                                id: project.id
                            }
                        }
                    },
                    include: {
                        project: true,
                        statistics: true,
                        commitMessages: true,
                        _count: true
                    }
                })
            })

            console.log(createCommitInfo)

            console.log("")
            console.log(`[${Tags.Debug}] Adding summary git changes to database.`)
            console.log(`[${Tags.Debug}] Project ID         : ${createCommitInfo.commitStatisticsId} (${createCommitInfo.id})`)
            console.log(`[${Tags.Debug}] Project Path       : ${createCommitInfo.project?.projectPath}`)
            console.log(`[${Tags.Debug}] Changes Contents   : ${changes.length} line${changes.length > 1 ? "s" : ""}`)
            console.log(`[${Tags.Debug}] Changes Number     : #${changesNumber}`)
            console.log(`[${Tags.Debug}] Elapsed Time       : ${elapsedMs}ms`)
            console.log(`[${Tags.Debug}] Timestamp          : ${timestamp}`)
            console.log("")
        },
        GetLatestSummaryGitChanges: async (projectID: string) => {
            const allData = await DatabaseService.CommitAI.GetAllSummaryGitChanges(projectID)
            return allData[allData.length - 1]
        },
        GetAllSummaryGitChanges: async (projectID: string) => {
            const project = await DatabaseClient.project.findUnique({
                where: {
                    commitAIIdentifier: projectID
                },
                include: {
                    commits: {
                        orderBy: { id: "asc" },
                        include: {
                            commitMessages: true,
                            statistics: true
                        }
                    }
                }
            })

            if (!project) return []

            return project.commits.map((commit, index) => ({
                index,
                commitInfoId: commit.id,
                createdAt: commit.createdAt,
                messages: commit.commitMessages,
                statistics: commit.statistics,
                projectID: project.commitAIIdentifier,
                projectDir: project.projectPath
            }));
        },
        GetLast5SummaryGitChanges: async (projectID: string) => {
            const allData = await DatabaseService.CommitAI.GetAllSummaryGitChanges(projectID)
            const last5 = allData.slice(0, 5)

            return last5
        }
    }
}