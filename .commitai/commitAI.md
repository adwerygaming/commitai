### Role & Objective
Act as an expert Senior Software Engineer and DevOps Specialist. Help me design and architect an automation tool that automatically converts staged Git changes into a well-formatted Git commit message, and optionally commits them.

### Project Overview
The goal is to eliminate manual commit messaging for routine updates by analyzing file diffs and generating contextual, accurate commit messages automatically using an LLM (Large Language Model) or localized parsing logic.

### Core Features & Workflow
1. **Trigger:** The tool should run either via a custom CLI command (e.g., `git auto-commit`) or as a Git `pre-commit` hook.
2. **State Analysis:** It must inspect the current Git repository for staged changes (equivalent to running `git diff --cached`).
3. **Parsing & Intelligence:**
   - Analyze the diffs to understand *what* changed (e.g., refactoring a function in `auth.js`, updating dependencies in `package.json`).
   - Group changes logically if multiple files are modified.
4. **Commit Message Generation:** Generate a message adhering strictly to the **Conventional Commits** specification (e.g., `feat(auth): add JWT validation`, `fix(ui): repair button alignment`).
5. **Execution:** Automatically execute `git commit -m "[Generated Message]"` or present the message to the user for approval before committing.

### Technical Requirements & Stack
- **Language:** [Specify your preferred language, e.g., Node.js, Python, or Go]
- **LLM Integration:** [Specify if you want to use an API like OpenAI/Anthropic, a local model like Ollama, or a regex-based approach]
- **Configuration:** The tool should allow configuration via a `.env` or `config.json` file (to tweak things like model choice, maximum token length, or preferred commit style).

### Expected Output from You (The AI)
Please provide:
1. A recommended architecture/file structure for this tool.
2. A step-by-step implementation guide.
3. A code snippet for the core logic that captures the git diff and processes it.
4. An optimal prompt template that this tool can send to an LLM to get the cleanest commit message back without extra conversational fluff.