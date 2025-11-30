/*
  Warnings:

  - You are about to drop the column `directory` on the `Project` table. All the data in the column will be lost.
  - Added the required column `commitAIIdentifier` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commitAIIdentifier" TEXT NOT NULL
);
INSERT INTO "new_Project" ("createdAt", "id", "lastModified") SELECT "createdAt", "id", "lastModified" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_commitAIIdentifier_key" ON "Project"("commitAIIdentifier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
