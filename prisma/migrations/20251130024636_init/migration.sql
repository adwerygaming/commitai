/*
  Warnings:

  - You are about to drop the `CommitChange` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommitData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommitDataStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommitDataStatsUsageMetadata` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommitDataStatsUsageMetadataPromtTokensDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectCommits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CommitChange";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CommitData";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CommitDataStats";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CommitDataStatsUsageMetadata";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CommitDataStatsUsageMetadataPromtTokensDetails";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectCommits";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "directory" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CommitInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CommitMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "commitInfoId" INTEGER,
    CONSTRAINT "CommitMessage_commitInfoId_fkey" FOREIGN KEY ("commitInfoId") REFERENCES "CommitInfo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_directory_key" ON "Project"("directory");
