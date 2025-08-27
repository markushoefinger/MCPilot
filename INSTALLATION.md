# 📚 MCPilot - Installation Guide

One MCP cockpit across tools and machines - Direct-save configuration management for Claude Desktop and Claude Code with GitHub Gist sync.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [GitHub Setup](#github-setup)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Multi-PC Sync](#multi-pc-sync)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Operating System**: Windows 10/11, macOS, or Linux
- **Node.js 14+** - [Download](https://nodejs.org/)
- **GitHub Account** with Personal Access Token
- **Web Browser** (Chrome, Edge, Firefox, Safari)

### Verify Node.js Installation

Open Command Prompt or PowerShell:
```bash
node --version
# Should output: v14.x.x or higher

npm --version  
# Should output: v6.x.x or higher
```

---

## Installation

### 1. Clone or Download

**Option A: Git Clone**
```bash
git clone https://github.com/markushoefinger/MCPilot.git
cd MCPilot
```

**Option B: Download ZIP**
1. Download from [GitHub repository](https://github.com/markushoefinger/MCPilot)
2. Extract to your preferred location (e.g., `C:\Tools\MCPilot`)

### 2. Start the Server

**Windows:**
```batch
START.bat
```
The browser will open automatically at `http://localhost:8080`

**macOS/Linux:**
```bash
node server-advanced.js
```
Then manually open your browser and navigate to `http://localhost:8080`

---

## GitHub Setup

### 1. Create Personal Access Token

1. Go to GitHub → Settings → Developer settings → [Personal access tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Name: `MCPilot`
4. Select scope: **`gist`** ✅
5. Click **Generate token**
6. **Copy the token** (starts with `ghp_`) - you won't see it again!

### 2. Create Configuration Gist

1. Go to [gist.github.com](https://gist.github.com)
2. Filename: `mcp.txt`
3. Content:
```json
{
  "mcpServers": {},
  "version": "1.0",
  "lastModified": null
}
```
4. Create gist (public or secret)
5. Copy the Gist ID from the URL
   - Example: `https://gist.github.com/username/abc123def456`
   - Your ID: `abc123def456`

---

## Configuration

### Initial Setup

1. Click the **gear icon ⚙️** in the web interface
2. Enter your credentials:
   - **GitHub Token**: Paste your `ghp_...` token
   - **Gist ID**: Paste your Gist ID
3. Click **Save Settings**
4. You should see "✅ Settings saved"

---

## Usage

### Loading Configuration
Click **Load from Gist** to fetch your current configuration

### Adding Servers
1. Click **Add New Server**
2. Fill in the details:
   - Server Name (e.g., `filesystem`)
   - Command Type
   - Package/Script
   - Optional arguments and environment variables
3. Click **Save Server**

### Saving Configuration

**To GitHub Gist:**
- Click **Save to Gist** - Updates central storage

**To Claude Applications:**
- Click **Claude Desktop** - Saves to `%APPDATA%\Claude\claude_desktop_config.json`
- Click **Claude Code** - Saves to `%USERPROFILE%\.claude.json`
- Click **Both** - Saves to both locations

### Automatic Backups
Every save creates timestamped backups:

**Windows:**
- Claude Desktop: `%APPDATA%\Claude\backups\`
- Claude Code: `%USERPROFILE%\backups\`

**macOS:**
- Claude Desktop: `~/Library/Application Support/Claude/backups/`
- Claude Code: `~/.claude-backups/`

**Linux:**
- Claude Desktop: `~/.config/Claude/backups/`
- Claude Code: `~/.claude-backups/`

Latest 10 backups are kept automatically

---

## Multi-PC Sync

### Setup on Other Computers

1. Install MCPilot on the new machine
2. Use the **same GitHub token and Gist ID**
3. Start the server:
   - **Windows**: Run `START.bat`
   - **macOS/Linux**: Run `node server-advanced.js`
4. Open browser at `http://localhost:8080`
5. Click **Load from Gist** to sync

### Workflow Example

**PC 1 (Work):**
1. Add/modify servers
2. Save to Gist
3. Version automatically increments

**PC 2 (Home):**
1. Load from Gist
2. Configurations synchronized!
3. Apply to Claude apps

---

## API Endpoints

The server provides REST API for automation:

- `GET /api/status` - Server status
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings
- `POST /api/save-config` - Save configuration
  ```json
  {
    "config": { /* your config */ },
    "target": "code" | "desktop" | "both"
  }
  ```

---

## Troubleshooting

### Node.js Not Found
- Ensure Node.js is installed and in PATH
- Restart terminal after installation

### GitHub Token Invalid
- Token must have `gist` scope
- Regenerate if expired
- Check for typos (should start with `ghp_`)

### Cannot Save Directly
- Ensure Node.js server is running
- Check firewall isn't blocking port 8080
- Try running as administrator

### Server Won't Start
- Check if port 8080 is free
- Verify Node.js installation: `node --version`

### Backup Issues
- Check write permissions to backup directories
- Ensure sufficient disk space

### Custom Port
To use a different port, set environment variable before starting:

**Windows (CMD):**
```batch
set MCP_PORT=8081
START.bat
```

**Windows (PowerShell):**
```powershell
$env:MCP_PORT = "8081"
.\START.bat
```

**macOS/Linux:**
```bash
export MCP_PORT=8081
node server-advanced.js
```

---

## Security Notes

- ✅ GitHub token stored locally only
- ✅ Gists can be private (only you can access)
- ✅ Automatic backups prevent data loss
- ✅ No data sent to third parties

---

## Support

Having issues?
1. Check the troubleshooting section above
2. Open an issue on [GitHub](https://github.com/markushoefinger/MCPilot/issues)
3. Include error messages and Node.js version

---

**Made with ❤️ for the Claude MCP community**