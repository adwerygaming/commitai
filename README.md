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
   bun run index.ts
   ```


## Usage
<details>
    <summary>If you are using Linux</summary>
    1. Change directory to the cloned repository:

    ```bash
    cd /path/to/commitai
    ```

    2. Make the shell script executable:

    ```bash
    chmod +x wcm.sh
    ```

    3. Make the shell script as symlink (to call from anywhere):
    
    ```bash
    ln -s $(pwd)/wcm.sh ~/.local/bin/mytool
    ```

    4. Now, everytime you want to create a commit message, just run:

    ```bash
    wcm
    ```
</details>

<details>
    <summary>If you are using Windows</summary>

    1. Search for "Environment Variables" in the Start Menu and open it.
    2. Under "System Variables", find and select the "Path" variable, then click "Edit".
    3. Click "New" and add the path to the directory where `wcm.bat` is located (e.g., `C:\Devan\Programming\commitai`).
    4. Click "OK" to close all dialog boxes.
    5. Now, everytime you want to create a commit message, just run:

    ```bash
    wcm
    ```
</details>
