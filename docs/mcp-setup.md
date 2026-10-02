# MCP Configuration: Filesystem Server

This project uses the **Model Context Protocol (MCP)** filesystem server so Kiro can directly read and write session data files, source code, and tests without leaving the AI context.

## What This MCP Server Does

The filesystem MCP server exposes these project directories to Kiro:
- `data/` — session JSON files (read/write)
- `src/` — source modules (read)
- `tests/` — test files (read)

This lets Kiro:
- Read `data/sessions.json` to analyze your focus data
- Suggest improvements based on actual session content
- Navigate test files without manual file attachments

## Setup Instructions

### Step 1: Install uv (Python package manager)
```bash
pip install uv
# or via Homebrew on macOS:
# brew install uv
```

### Step 2: Configure MCP in Kiro

Open the Kiro MCP settings file at `~/.kiro/settings/mcp.json` and add:

```json
{
  "mcpServers": {
    "pomodoro-filesystem": {
      "command": "uvx",
      "args": [
        "mcp-server-filesystem@latest",
        "v:\\kiro-university-project\\data",
        "v:\\kiro-university-project\\src",
        "v:\\kiro-university-project\\tests"
      ],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false
    }
  }
}
```

### Step 3: Reconnect MCP Servers

In Kiro, open the **MCP Server view** in the feature panel and click **Reconnect**, or use the Command Palette and search for `MCP`.

## How It's Used in This Project

Once connected, you can ask Kiro things like:
- "Read my sessions.json and tell me my most productive week"
- "Check if my test files follow the project standards"
- "Show me what sessions I logged last week"

The MCP server handles the file access so Kiro works with live data rather than you having to paste file contents into chat.
