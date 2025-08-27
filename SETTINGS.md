# MCPilot - Settings Documentation

## Configurable Settings

MCPilot allows you to customize various settings through the web interface or environment variables.

## Settings Overview

### GitHub Configuration
- **GitHub Token**: Your personal access token with `gist` scope
- **Gist ID**: The ID of your configuration Gist

### File Paths
- **Claude Desktop Config Path**: Custom path for Claude Desktop configuration
  - Default: `%APPDATA%\Claude\claude_desktop_config.json`
  - Environment variable: `MCP_CLAUDE_DESKTOP_PATH`
  
- **Claude Code Config Path**: Custom path for Claude Code configuration
  - Default: `%USERPROFILE%\.claude.json`
  - Environment variable: `MCP_CLAUDE_CODE_PATH`

### Advanced Settings
- **Max Backups**: Number of backup files to keep
  - Default: 10
  - Range: 1-100
  - Environment variable: `MCP_MAX_BACKUPS`

### Server Configuration
- **Port**: Server port (requires restart to change)
  - Default: 8080
  - Environment variable: `MCP_PORT`
  - Note: Must be set before starting the server

## Setting Methods

### 1. Web Interface
Click the gear icon ⚙️ in the top right corner to open the settings modal. All settings can be configured here and are saved to localStorage.

### 2. Environment Variables
Set environment variables before starting the server:

**Windows Command Prompt:**
```batch
set MCP_PORT=8081
set MCP_MAX_BACKUPS=20
set MCP_CLAUDE_DESKTOP_PATH=C:\Custom\Path\claude_desktop.json
set MCP_CLAUDE_CODE_PATH=C:\Custom\Path\claude.json
START.bat
```

**Windows PowerShell:**
```powershell
$env:MCP_PORT = "8081"
$env:MCP_MAX_BACKUPS = "20"
$env:MCP_CLAUDE_DESKTOP_PATH = "C:\Custom\Path\claude_desktop.json"
$env:MCP_CLAUDE_CODE_PATH = "C:\Custom\Path\claude.json"
.\START.bat
```

**macOS/Linux:**
```bash
export MCP_PORT=8081
export MCP_MAX_BACKUPS=20
export MCP_CLAUDE_DESKTOP_PATH="/custom/path/claude_desktop.json"
export MCP_CLAUDE_CODE_PATH="/custom/path/claude.json"
node server-advanced.js
```

### 3. API Endpoints

**Get Current Settings:**
```http
GET /api/settings
```

**Update Settings:**
```http
POST /api/settings
Content-Type: application/json

{
  "paths": {
    "claudeDesktop": "C:\\Custom\\Path\\claude_desktop.json",
    "claudeCode": "C:\\Custom\\Path\\claude.json"
  },
  "maxBackups": 20
}
```

## Priority Order

Settings are applied in this order (highest priority first):
1. Web Interface settings (saved in localStorage)
2. API updates (runtime changes)
3. Environment variables (server start)
4. Default values (hardcoded)

## Common Use Cases

### Different Installation Paths
If Claude is installed in a non-standard location:
1. Open Settings (gear icon)
2. Enter custom paths in "File Paths" section
3. Save settings

### Portable Setup
For USB or portable installations:
1. Use relative paths in settings
2. Or set environment variables in a batch file

### Corporate Environments
Where paths may be restricted:
1. Set custom paths to writable directories
2. Configure max backups based on storage policies

### Multiple Claude Installations
Managing different Claude versions:
1. Set different paths for each version
2. Use environment variables to switch between them

## Troubleshooting

### Settings Not Saving
- Ensure localStorage is enabled in your browser
- Check browser console for errors
- Try clearing browser cache

### Custom Paths Not Working
- Verify the paths exist and are writable
- Use absolute paths, not relative
- Check for proper escaping in paths (use `\\` or `/`)

### Environment Variables Not Applied
- Set variables before starting the server
- Restart the server after changing environment variables
- Verify with `echo %VARIABLE_NAME%` (CMD) or `$env:VARIABLE_NAME` (PowerShell)

## Security Notes

- Settings are stored locally only
- GitHub token is never sent to any third-party service
- Custom paths should be in secure, user-writable locations
- Backup files inherit permissions from parent directory