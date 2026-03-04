import { Gemini } from "../gemini/Gemini.js";
import Tags from "../utils/Tags.js";
import { CommitAI } from "./CommitAI.js";
import { Projects } from "./Projects.js";

const projectDir = process.env.CALL_FROM; // automatically provided if u are running via sh / bat script
const args = process.argv.slice(2);
const userContext = args.join(" ");
const useProxy = true

console.log("")
console.log(`[${Tags.CommitAI}] Generative Commit Message`);

if (!projectDir) {
    console.log(`[${Tags.Error}] Failed to get Project Directory. Make sure you are running this project from a script with env passthrough.`)
    process.exit(1);
}

if (userContext.length > 0) {
    console.log(`[${Tags.CommitAI}] Additional user context provided: "${userContext}"`);
}

const commitAI = new CommitAI(projectDir)
const projects = new Projects(projectDir)
const gemini = new Gemini()

const repoCheck = await commitAI.isRepo()

if (!repoCheck) {
    console.log(`[${Tags.CommitAI}] This directory dosen't appear to be a git repo. Make sure to init first.`)
    process.exit(1)
}

const project = await projects.init()
const branch = await commitAI.currentBranch()
await commitAI.checkGitIgnoreFile()
await commitAI.fetchConfigDir()

console.log(`[${Tags.CommitAI}] Project Name        : ${project.name}`)
console.log(`[${Tags.CommitAI}] Project path        : ${project.project_path}`)
console.log(`[${Tags.CommitAI}] Working on branch   : ${branch}`)

console.log("")
const projectContext = await projects.fetchContext()
console.log("")

const gitDiffContent = await commitAI.fetchGitChanges()

if (!gitDiffContent) {
    console.log(`[${Tags.CommitAI}] ${project.name} (${project.project_path}) dosen't have any changes.`)
    process.exit(1)
}

const ai = await gemini.generate({
    content: gitDiffContent,
    additionalContext: userContext,
    projectContext,
    useProxy
})

const aiResponse = ai.content

if (aiResponse.length == 0) {
    console.log(`[${Tags.CommitAI}] There is nothing to push.`)
    process.exit(1)
}

console.log("")
const pushResult = await commitAI.push(aiResponse)
console.log("")

if (pushResult) {
    console.log(`[${Tags.CommitAI}] OK!`)
} else {
    console.log(`[${Tags.CommitAI}] Push Failed.`)
}

process.exit(1)