/*
  Warnings:

  - You are about to drop the column `commitMessageId` on the `CommitInfo` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommitInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commitStatisticsId" INTEGER NOT NULL,
    "projectId" INTEGER,
    CONSTRAINT "CommitInfo_commitStatisticsId_fkey" FOREIGN KEY ("commitStatisticsId") REFERENCES "CommitStatistics" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommitInfo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommitInfo" ("commitStatisticsId", "createdAt", "id", "lastModified", "projectId") SELECT "commitStatisticsId", "createdAt", "id", "lastModified", "projectId" FROM "CommitInfo";
DROP TABLE "CommitInfo";
ALTER TABLE "new_CommitInfo" RENAME TO "CommitInfo";
CREATE TABLE "new_CommitMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "commitInfoId" INTEGER,
    CONSTRAINT "CommitMessage_commitInfoId_fkey" FOREIGN KEY ("commitInfoId") REFERENCES "CommitInfo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommitMessage" ("createdAt", "id", "lastModified", "message") SELECT "createdAt", "id", "lastModified", "message" FROM "CommitMessage";
DROP TABLE "CommitMessage";
ALTER TABLE "new_CommitMessage" RENAME TO "CommitMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
