<div align="center">
    <h1>CommitAI</h1>
    <p>AI-powered commit message generator for Git. Powered by <a href="https://gemini.google.com">Google Gemini AI.</a></p>
</div>

## Features
- Generates commit messages based on code changes.
- Supports multiple AI personalities.
- Create a summary of changes then commit them.
- Desktop notifications for commit status.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/adwerygaming/commitai.git
   cd commitai
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run:
   ```bash
   bun run start
   ```

## Usage
<p>Select your operating system below for setup instructions.</p>

<details>
  <summary><strong>Linux</strong></summary>
  <section aria-label="Linux usage">
    <ol>
      <li>
        <p>Change directory to the cloned repository:</p>
        <pre><code>cd /path/to/commitai</code></pre>
      </li>
      <li>
        <p>Make the shell script executable:</p>
        <pre><code>chmod +x wcm.sh</code></pre>
      </li>
      <li>
        <p>Create a symlink to call it from anywhere:</p>
        <pre><code>ln -s "$(pwd)/wcm.sh" ~/.local/bin/wcm</code></pre>
        <p>If <code>~/.local/bin</code> is not in your <code>PATH</code>, add it to your shell config:</p>
        <pre><code>echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc</code></pre>
      </li>
      <li>
        <p>Run the command globally:</p>
        <pre><code>wcm</code></pre>
      </li>
      <li>
        <p>Verify installation:</p>
        <pre><code>which wcm</code></pre>
      </li>
    </ol>
  </section>
</details>

<details>
  <summary><strong>Windows</strong></summary>
  <section aria-label="Windows usage">
    <ol>
      <li>
        <p>Search for <strong>Environment Variables</strong> in the Start Menu and open it.</p>
      </li>
      <li>
        <p>Under <strong>System Variables</strong>, find and select <code>Path</code> → click <strong>Edit</strong>.</p>
      </li>
      <li>
        <p>Click <strong>New</strong> and add the directory path where <code>wcm.bat</code> is located. For example:</p>
        <pre><code>C:\Users\YourName\Projects\commitai</code></pre>
      </li>
      <li>
        <p>Click <strong>OK</strong> on all dialogs to apply changes.</p>
      </li>
      <li>
        <p>Now open a new Command Prompt or PowerShell window and run:</p>
        <pre><code>wcm</code></pre>
      </li>
    </ol>
  </section>
</details>


> [!NOTE]
> - Use <code>wcm</code> on staged files or recent commits for best results.
> - If you move the project folder, recreate the symlink to update the path.