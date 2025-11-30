/*
  Warnings:

  - Added the required column `changesNumber` to the `CommitChange` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommitChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "changeMessage" TEXT NOT NULL,
    "changesNumber" INTEGER NOT NULL,
    "commitId" INTEGER NOT NULL,
    CONSTRAINT "CommitChange_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "CommitData" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommitChange" ("changeMessage", "commitId", "id") SELECT "changeMessage", "commitId", "id" FROM "CommitChange";
DROP TABLE "CommitChange";
ALTER TABLE "new_CommitChange" RENAME TO "CommitChange";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
