-- CreateTable
CREATE TABLE "ProjectCommits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectPath" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CommitData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statsId" INTEGER NOT NULL,
    "elapsedMs" BIGINT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "commitChangesId" INTEGER,
    CONSTRAINT "CommitData_statsId_fkey" FOREIGN KEY ("statsId") REFERENCES "CommitDataStats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommitData_commitChangesId_fkey" FOREIGN KEY ("commitChangesId") REFERENCES "ProjectCommits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommitChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "changeMessage" TEXT NOT NULL,
    "commitId" INTEGER NOT NULL,
    CONSTRAINT "CommitChange_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "CommitData" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommitDataStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modelVersion" TEXT NOT NULL,
    "usageMetadataId" INTEGER NOT NULL,
    CONSTRAINT "CommitDataStats_usageMetadataId_fkey" FOREIGN KEY ("usageMetadataId") REFERENCES "CommitDataStatsUsageMetadata" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommitDataStatsUsageMetadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "promptTokenCount" BIGINT NOT NULL,
    "candidatesTokenCount" BIGINT NOT NULL,
    "totalTokenCount" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "CommitDataStatsUsageMetadataPromtTokensDetails" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modality" TEXT NOT NULL,
    "tokenCount" BIGINT NOT NULL,
    "usageMetadataId" INTEGER NOT NULL,
    CONSTRAINT "CommitDataStatsUsageMetadataPromtTokensDetails_usageMetadataId_fkey" FOREIGN KEY ("usageMetadataId") REFERENCES "CommitDataStatsUsageMetadata" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCommits_projectPath_key" ON "ProjectCommits"("projectPath");

-- CreateIndex
CREATE UNIQUE INDEX "CommitData_statsId_key" ON "CommitData"("statsId");
