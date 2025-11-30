/*
  Warnings:

  - You are about to drop the column `commitChangesId` on the `CommitData` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommitData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statsId" INTEGER NOT NULL,
    "elapsedMs" BIGINT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "projectCommitId" INTEGER,
    CONSTRAINT "CommitData_statsId_fkey" FOREIGN KEY ("statsId") REFERENCES "CommitDataStats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommitData_projectCommitId_fkey" FOREIGN KEY ("projectCommitId") REFERENCES "ProjectCommits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommitData" ("elapsedMs", "id", "statsId", "timestamp") SELECT "elapsedMs", "id", "statsId", "timestamp" FROM "CommitData";
DROP TABLE "CommitData";
ALTER TABLE "new_CommitData" RENAME TO "CommitData";
CREATE UNIQUE INDEX "CommitData_statsId_key" ON "CommitData"("statsId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
