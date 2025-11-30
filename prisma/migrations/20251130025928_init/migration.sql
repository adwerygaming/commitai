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
INSERT INTO "new_CommitInfo" ("commitStatisticsId", "createdAt", "id", "lastModified") SELECT "commitStatisticsId", "createdAt", "id", "lastModified" FROM "CommitInfo";
DROP TABLE "CommitInfo";
ALTER TABLE "new_CommitInfo" RENAME TO "CommitInfo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
