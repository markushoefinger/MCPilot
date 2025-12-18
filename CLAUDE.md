# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCPilot is a web-based configuration manager for MCP (Model Context Protocol) servers. It provides a unified interface to manage configurations for Claude Desktop, Claude Code CLI, Cursor, and Claude IDE Cursor across multiple machines using GitHub Gist for synchronization.

## Commands

```bash
# Start the server (Windows)
START.bat

# Start the server (macOS/Linux/manual)
node server-advanced.js

# Start via npm
npm start
```

The server runs at http://localhost:8080 by default. Set `MCP_PORT` environment variable to use a different port.

## Architecture

### Two-Component System

1. **Backend** (`server-advanced.js`) - Node.js HTTP server with zero dependencies
   - Serves static files (HTML, JS, CSS)
   - REST API for direct config save with automatic backups
   - Platform-aware path resolution for config files

2. **Frontend** (`app.js` + `index.html`) - Vanilla JavaScript SPA
   - GitHub API integration for Gist sync
   - localStorage for settings persistence
   - Falls back to download mode when server unavailable

### Key Data Flow

```
GitHub Gist <---> Frontend (app.js) ---> Backend API ---> Config Files
                      |
                  localStorage (credentials, paths)
```

### Config File Targets

| Target | Windows Path | macOS Path |
|--------|-------------|------------|
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Code CLI | `%USERPROFILE%\.claude.json` | `~/.claude.json` |
| Cursor | `%USERPROFILE%\.cursor\mcp.json` | `~/.cursor/mcp.json` |
| Claude IDE Cursor | Same as Cursor | Same as Cursor |

### API Endpoints

- `GET /api/status` - Server capabilities and config paths
- `GET /api/settings` - Current settings
- `POST /api/settings` - Update paths and backup count
- `POST /api/save-config` - Save config to target(s) with automatic backup
- `GET /api/hostname` - Get system hostname for sync tracking

### Environment Variables

- `MCP_PORT` - Server port (default: 8080)
- `MCP_MAX_BACKUPS` - Backup retention count (default: 10)
- `MCP_CLAUDE_CODE_PATH` - Override Claude Code config path
- `MCP_CLAUDE_DESKTOP_PATH` - Override Claude Desktop config path
- `MCP_CURSOR_PATH` - Override Cursor config path

## Config Structure

The Gist stores configs in this format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["package-name", "--arg"],
      "env": { "KEY": "value" },
      "enabled": true
    }
  },
  "version": "1.0",
  "lastModified": "ISO-timestamp",
  "modifiedBy": "hostname"
}
```

When saved to Claude/Cursor configs, only enabled servers are written and metadata is stripped.
