
import Tags from "../utils/Tags.js";
import { CommitAI } from "./CommitAI.js";
import { Projects } from "./Projects.js";

const projectDir = process.env.CALL_FROM; // automatically provided if u are running via sh / bat script
const args = process.argv.slice(2);
const userContext = args.join(" ").length > 0 ? args.join(" ") : null;

console.log("")
console.log(`[${Tags.CommitAI}] Generative Commit Message`);

if (!projectDir) {
    throw new Error("Failed to get Project Directory. Make sure you are running this project from a script with env passthrough.")
}

if (userContext) {
    console.log(`[${Tags.CommitAI}] Additional user context provided: "${userContext}"`);
}

const commitAI = new CommitAI(projectDir)
const projects = new Projects(projectDir)

const repoCheck = await commitAI.getRepoStatus()
if (!repoCheck) {
    throw new Error("This directory dosen't appear to be a git repo. Make sure to init first.")
}

const project = await projects.init()
const branch = await commitAI.getCurrentBranch()

try {
    await commitAI.checkGitIgnoreFile()
} catch {
    // silent
}

try {
    await commitAI.fetchConfigDir()
} catch {
    console.log(`[${Tags.Warn}] Failed to fetch .commitai config directory.`)
}

console.log(`[${Tags.CommitAI}] Project Name        : ${project.name}`)
console.log(`[${Tags.CommitAI}] Project path        : ${project.project_path}`)
console.log(`[${Tags.CommitAI}] Working on branch   : ${branch}`)

const gitDiffContent = await commitAI.fetchGitChanges()
console.log("")

if (!gitDiffContent) {
    console.log(`[${Tags.CommitAI}] This repo dosen't have any tracked changes.`)
    process.exit(1)
}

const data = await commitAI.summarize({ diffChanges: gitDiffContent, userContext })

if (!data || data?.changes.length == 0) {
    console.log(`[${Tags.CommitAI}] There is nothing to push.`)
    process.exit(1)
}

console.log("")
const pushResult = await commitAI.push(data.changes)
console.log("")

if (pushResult) {
    console.log(`[${Tags.CommitAI}] OK!`)
} else {
    console.log(`[${Tags.CommitAI}] Push Failed.`)
}

process.exit(0)