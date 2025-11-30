/*
  Warnings:

  - Added the required column `commitStatisticsId` to the `CommitInfo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "CommitStatistics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelVersion" TEXT NOT NULL,
    "promptTokenCount" BIGINT NOT NULL,
    "candidatesTokenCount" BIGINT NOT NULL,
    "totalTokenCount" BIGINT NOT NULL,
    "tokenCount" BIGINT NOT NULL,
    "modality" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommitInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commitStatisticsId" INTEGER NOT NULL,
    CONSTRAINT "CommitInfo_commitStatisticsId_fkey" FOREIGN KEY ("commitStatisticsId") REFERENCES "CommitStatistics" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommitInfo" ("createdAt", "id", "lastModified") SELECT "createdAt", "id", "lastModified" FROM "CommitInfo";
DROP TABLE "CommitInfo";
ALTER TABLE "new_CommitInfo" RENAME TO "CommitInfo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
