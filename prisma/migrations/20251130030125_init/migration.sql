/*
  Warnings:

  - Added the required column `projectPath` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectPath" TEXT NOT NULL,
    "commitAIIdentifier" TEXT NOT NULL
);
INSERT INTO "new_Project" ("commitAIIdentifier", "createdAt", "id", "lastModified") SELECT "commitAIIdentifier", "createdAt", "id", "lastModified" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectPath_key" ON "Project"("projectPath");
CREATE UNIQUE INDEX "Project_commitAIIdentifier_key" ON "Project"("commitAIIdentifier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
