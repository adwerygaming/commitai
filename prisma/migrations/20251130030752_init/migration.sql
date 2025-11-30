/*
  Warnings:

  - You are about to drop the column `commitInfoId` on the `CommitMessage` table. All the data in the column will be lost.
  - Added the required column `commitMessageId` to the `CommitInfo` table without a default value. This is not possible if the table is not empty.

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
    "commitMessageId" INTEGER NOT NULL,
    CONSTRAINT "CommitInfo_commitMessageId_fkey" FOREIGN KEY ("commitMessageId") REFERENCES "CommitMessage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
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
    "message" TEXT NOT NULL
);
INSERT INTO "new_CommitMessage" ("createdAt", "id", "lastModified", "message") SELECT "createdAt", "id", "lastModified", "message" FROM "CommitMessage";
DROP TABLE "CommitMessage";
ALTER TABLE "new_CommitMessage" RENAME TO "CommitMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
