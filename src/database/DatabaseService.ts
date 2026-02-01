import fs from "fs";
import path from "path";
import { CommitAIService } from "../commitai/CommitAIService";
import type { SummaryGitChangesStatsResponse } from "../gemini/GeminiService";
import { type CommitMessage, type CommitStatistics } from "../generated/prisma/client";
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

interface GetCurrentChangesNumberResponse {
    newChangesNumber: number,
    currentChangesNumber: number
}

interface GetAllSummaryGitChangesResponse {
    index: number,
    commitInfoId: number,
    createdAt: Date,
    messages: CommitMessage[],
    statistics: CommitStatistics | null,
    projectID: string,
    projectDir: string
}

export const DatabaseService = {
    CommitAI: {
        /**
         * Resolves a project directory to its unique CommitAI identifier.
         * Creates a new identifier file if one doesn't exist.
         * @param {string} projectDir - The project directory path
         * @returns {Promise<string>} The unique project identifier (UUID)
         */
        async ResolveProjectDirToID(projectDir: string): Promise<string> {
            const commitAIIdentifierFIle = path.join(projectDir, ".commitai");
            const checkIdentifierFile = fs.existsSync(commitAIIdentifierFIle)

            if (!checkIdentifierFile) {
                console.log(`[${Tags.System}] No CommitAI Identifier on ${projectDir}. Creating new one...`)
                await CommitAIService().CreateIdentifierFile(projectDir)
            }

            await CommitAIService().UpdateGitignoreFile(projectDir)

            const identifierFile = fs.readFileSync(commitAIIdentifierFIle, "utf-8").trim() // should be uuid
            // console.log(`[${Tags.Debug}] UUID: ${identifierFile}`)
            return identifierFile
        },

        /**
         * Gets the current number of commits for a project and calculates the next commit number.
         * @param {string} projectID - The unique project identifier
         * @returns {Promise<GetCurrentChangesNumberResponse>} Current and new changes numbers
         */
        async GetCurrentChangesNumber(projectID: string): Promise<GetCurrentChangesNumberResponse> {
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

        /**
         * Adds a summary of git changes to the database.
         * Creates or updates project record and stores commit information with statistics.
         * @param {DatabaseAddSummaryGitChangesProp} props - Properties for adding summary
         * @param {string} props.projectDir - The project directory path
         * @param {string[]} props.changes - Array of commit messages
         * @param {number} props.elapsedMs - Time elapsed in milliseconds
         * @param {SummaryGitChangesStatsResponse} props.stats - Statistics from AI generation
         * @returns {Promise<void>}
         * @throws {Error} When no changes are provided
         */
        async AddSummaryGitChanges({ changes, elapsedMs, projectDir, stats }: DatabaseAddSummaryGitChangesProp): Promise<void> {
            const projectID = await DatabaseService.CommitAI.ResolveProjectDirToID(projectDir)

            if (changes.length == 0) {
                throw new Error("No changes to add to database.");
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

            console.log("")
            console.log(`[${Tags.System}] Adding summary git changes to database.`)
            console.log(`[${Tags.System}] Project ID         : ${createCommitInfo.project?.commitAIIdentifier} (${createCommitInfo.project?.id})`)
            console.log(`[${Tags.System}] Project Path       : ${createCommitInfo.project?.projectPath}`)
            console.log(`[${Tags.System}] Changes Contents   : ${changes.length} line${changes.length > 1 ? "s" : ""}`)
            console.log(`[${Tags.System}] Changes Number     : #${changesNumber}`)
            console.log(`[${Tags.System}] Elapsed Time       : ${elapsedMs}ms`)
            console.log(`[${Tags.System}] Timestamp          : ${timestamp}`)
            console.log("")
        },

        /**
         * Retrieves the latest summary of git changes for a project.
         * @param {string} projectID - The unique project identifier
         * @returns {Promise<GetAllSummaryGitChangesResponse | null>} The latest commit information or null if none exists
         */
        async GetLatestSummaryGitChanges(projectID: string): Promise<GetAllSummaryGitChangesResponse | null> {
            const allData = await DatabaseService.CommitAI.GetAllSummaryGitChanges(projectID)
            const ptr = allData.length - 1

            const res = allData?.[ptr] ?? null
            return res
        },

        /**
         * Retrieves all summary git changes for a project, ordered by commit ID.
         * @param {string} projectID - The unique project identifier
         * @returns {Promise<GetAllSummaryGitChangesResponse[]>} Array of all commit information
         */
        async GetAllSummaryGitChanges(projectID: string): Promise<GetAllSummaryGitChangesResponse[]> {
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

            const res = project.commits.map((commit, index) => ({
                index,
                commitInfoId: commit.id,
                createdAt: commit.createdAt,
                messages: commit.commitMessages,
                statistics: commit.statistics,
                projectID: project.commitAIIdentifier,
                projectDir: project.projectPath
            }));

            return res
        },

        /**
         * Retrieves the last 5 summary git changes for a project in reverse order.
         * @param {string} projectID - The unique project identifier
         * @returns {Promise<GetAllSummaryGitChangesResponse[]>} Array of the last 5 commit information
         */
        async GetLast5SummaryGitChanges(projectID: string): Promise<GetAllSummaryGitChangesResponse[]> {
            const allData = await DatabaseService.CommitAI.GetAllSummaryGitChanges(projectID)
            const last5 = allData.reverse().slice(0, 5)

            return last5
        }
    }
}