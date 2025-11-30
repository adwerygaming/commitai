/*
  Warnings:

  - You are about to drop the column `lastModified` on the `CommitInfo` table. All the data in the column will be lost.
  - You are about to drop the column `lastModified` on the `CommitMessage` table. All the data in the column will be lost.
  - You are about to drop the column `lastModified` on the `CommitStatistics` table. All the data in the column will be lost.
  - You are about to drop the column `lastModified` on the `Project` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommitInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commitStatisticsId" INTEGER NOT NULL,
    "projectId" INTEGER,
    CONSTRAINT "CommitInfo_commitStatisticsId_fkey" FOREIGN KEY ("commitStatisticsId") REFERENCES "CommitStatistics" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommitInfo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommitInfo" ("commitStatisticsId", "createdAt", "id", "projectId") SELECT "commitStatisticsId", "createdAt", "id", "projectId" FROM "CommitInfo";
DROP TABLE "CommitInfo";
ALTER TABLE "new_CommitInfo" RENAME TO "CommitInfo";
CREATE TABLE "new_CommitMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "commitInfoId" INTEGER,
    CONSTRAINT "CommitMessage_commitInfoId_fkey" FOREIGN KEY ("commitInfoId") REFERENCES "CommitInfo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommitMessage" ("commitInfoId", "createdAt", "id", "message") SELECT "commitInfoId", "createdAt", "id", "message" FROM "CommitMessage";
DROP TABLE "CommitMessage";
ALTER TABLE "new_CommitMessage" RENAME TO "CommitMessage";
CREATE TABLE "new_CommitStatistics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelVersion" TEXT NOT NULL,
    "promptTokenCount" BIGINT NOT NULL,
    "candidatesTokenCount" BIGINT NOT NULL,
    "totalTokenCount" BIGINT NOT NULL,
    "tokenCount" BIGINT NOT NULL,
    "modality" TEXT NOT NULL
);
INSERT INTO "new_CommitStatistics" ("candidatesTokenCount", "createdAt", "id", "modality", "modelVersion", "promptTokenCount", "tokenCount", "totalTokenCount") SELECT "candidatesTokenCount", "createdAt", "id", "modality", "modelVersion", "promptTokenCount", "tokenCount", "totalTokenCount" FROM "CommitStatistics";
DROP TABLE "CommitStatistics";
ALTER TABLE "new_CommitStatistics" RENAME TO "CommitStatistics";
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectPath" TEXT NOT NULL,
    "commitAIIdentifier" TEXT NOT NULL
);
INSERT INTO "new_Project" ("commitAIIdentifier", "createdAt", "id", "projectPath") SELECT "commitAIIdentifier", "createdAt", "id", "projectPath" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectPath_key" ON "Project"("projectPath");
CREATE UNIQUE INDEX "Project_commitAIIdentifier_key" ON "Project"("commitAIIdentifier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
