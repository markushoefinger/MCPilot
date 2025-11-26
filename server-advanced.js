// Advanced MCP Config Server with Direct Save Capability
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper function to get platform-specific Claude Desktop path
function getClaudeDesktopPath() {
    const platform = os.platform();
    const home = os.homedir();

    switch(platform) {
        case 'win32':
            return path.join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
        case 'darwin': // macOS
            return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        case 'linux':
            return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
        default:
            // Fallback to Linux path for unknown platforms
            return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
    }
}

// Helper function to get platform-specific Cursor MCP path
function getCursorPath() {
    const platform = os.platform();
    const home = os.homedir();

    switch(platform) {
        case 'win32':
            return path.join(home, '.cursor', 'mcp.json');
        case 'darwin': // macOS
            return path.join(home, '.cursor', 'mcp.json');
        case 'linux':
            return path.join(home, '.cursor', 'mcp.json');
        default:
            return path.join(home, '.cursor', 'mcp.json');
    }
}

// Helper function to get platform-specific Claude IDE Cursor path
function getClaudeIdeCursorPath() {
    const platform = os.platform();
    const home = os.homedir();

    switch(platform) {
        case 'win32':
            return path.join(home, '.cursor', 'mcp.json');
        case 'darwin': // macOS
            return path.join(home, '.cursor', 'mcp.json');
        case 'linux':
            return path.join(home, '.cursor', 'mcp.json');
        default:
            return path.join(home, '.cursor', 'mcp.json');
    }
}

// Configuration - can be overridden via environment variables
const CONFIG = {
    port: process.env.MCP_PORT || 8080,
    maxBackups: parseInt(process.env.MCP_MAX_BACKUPS) || 10,
    // Default paths - can be overridden via /api/settings endpoint
    paths: {
        claudeCode: process.env.MCP_CLAUDE_CODE_PATH || path.join(os.homedir(), '.claude.json'),
        claudeDesktop: process.env.MCP_CLAUDE_DESKTOP_PATH || getClaudeDesktopPath(),
        cursor: process.env.MCP_CURSOR_PATH || getCursorPath(),
        claudeIdeCursor: process.env.MCP_CLAUDE_IDE_CURSOR_PATH || getClaudeIdeCursorPath()
    }
};

// For backward compatibility - these will be updated dynamically
const PORT = CONFIG.port;
const SERVER_DIR = __dirname;
let CLAUDE_CODE_PATH = CONFIG.paths.claudeCode;
let CLAUDE_DESKTOP_PATH = CONFIG.paths.claudeDesktop;
let CURSOR_PATH = CONFIG.paths.cursor;
let CLAUDE_IDE_CURSOR_PATH = CONFIG.paths.claudeIdeCursor;

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Create HTTP server
const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    // API: Save config directly to system
    if (req.url === '/api/save-config' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const config = data.config;
                const target = data.target; // 'code', 'desktop', or 'both'
                
                // Create clean config (only enabled servers)
                const cleanConfig = { mcpServers: {} };
                
                Object.entries(config.mcpServers || {}).forEach(([name, server]) => {
                    if (server.enabled !== false) {
                        cleanConfig.mcpServers[name] = {
                            command: server.command,
                            args: server.args || []
                        };
                        
                        if (server.env && Object.keys(server.env).length > 0) {
                            cleanConfig.mcpServers[name].env = server.env;
                        }
                    }
                });
                
                const configJson = JSON.stringify(cleanConfig, null, 2);
                const results = [];
                
                // Helper function for creating backups
                const createBackup = (filePath, targetName) => {
                    if (fs.existsSync(filePath)) {
                        // Create timestamp for backup
                        const now = new Date();
                        const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
                        const backupDir = path.join(path.dirname(filePath), 'backups');
                        
                        // Ensure backup directory exists
                        if (!fs.existsSync(backupDir)) {
                            fs.mkdirSync(backupDir, { recursive: true });
                        }
                        
                        // Create backup filename
                        const filename = path.basename(filePath, '.json');
                        const backupPath = path.join(backupDir, `${filename}-${timestamp}.json`);
                        
                        // Copy file to backup
                        fs.copyFileSync(filePath, backupPath);
                        console.log(`✅ Backup created: ${backupPath}`);
                        
                        // Clean old backups (keep only last 10)
                        const backupFiles = fs.readdirSync(backupDir)
                            .filter(f => f.startsWith(filename) && f.endsWith('.json'))
                            .sort()
                            .reverse();
                        
                        if (backupFiles.length > CONFIG.maxBackups) {
                            // Delete old backups
                            backupFiles.slice(CONFIG.maxBackups).forEach(oldBackup => {
                                const oldPath = path.join(backupDir, oldBackup);
                                fs.unlinkSync(oldPath);
                                console.log(`🗑️ Deleted old backup: ${oldBackup}`);
                            });
                        }
                        
                        return { backup: true, path: backupPath };
                    }
                    return { backup: false };
                };
                
                // Save based on target
                if (target === 'code' || target === 'both' || target === 'all') {
                    try {
                        // Create backup
                        const backupResult = createBackup(CLAUDE_CODE_PATH, 'Claude Code CLI');

                        // Save new config
                        fs.writeFileSync(CLAUDE_CODE_PATH, configJson, 'utf8');
                        results.push({
                            target: 'Claude Code CLI',
                            status: 'success',
                            path: CLAUDE_CODE_PATH,
                            backup: backupResult
                        });
                    } catch (err) {
                        results.push({ target: 'Claude Code CLI', status: 'error', error: err.message });
                    }
                }
                
                if (target === 'desktop' || target === 'both' || target === 'all') {
                    try {
                        // Ensure directory exists
                        const dir = path.dirname(CLAUDE_DESKTOP_PATH);
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }

                        // Create backup
                        const backupResult = createBackup(CLAUDE_DESKTOP_PATH, 'Claude Desktop');

                        // Save new config
                        fs.writeFileSync(CLAUDE_DESKTOP_PATH, configJson, 'utf8');
                        results.push({
                            target: 'Claude Desktop',
                            status: 'success',
                            path: CLAUDE_DESKTOP_PATH,
                            backup: backupResult
                        });
                    } catch (err) {
                        results.push({ target: 'Claude Desktop', status: 'error', error: err.message });
                    }
                }

                if (target === 'cursor' || target === 'all') {
                    try {
                        // Ensure directory exists
                        const dir = path.dirname(CURSOR_PATH);
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }

                        // Create backup
                        const backupResult = createBackup(CURSOR_PATH, 'Cursor');

                        // Save new config
                        fs.writeFileSync(CURSOR_PATH, configJson, 'utf8');
                        results.push({
                            target: 'Cursor',
                            status: 'success',
                            path: CURSOR_PATH,
                            backup: backupResult
                        });
                    } catch (err) {
                        results.push({ target: 'Cursor', status: 'error', error: err.message });
                    }
                }

                if (target === 'claudeIdeCursor' || target === 'all') {
                    try {
                        // Ensure directory exists
                        const dir = path.dirname(CLAUDE_IDE_CURSOR_PATH);
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }

                        // Create backup
                        const backupResult = createBackup(CLAUDE_IDE_CURSOR_PATH, 'Claude IDE Cursor');

                        // Save new config
                        fs.writeFileSync(CLAUDE_IDE_CURSOR_PATH, configJson, 'utf8');
                        results.push({
                            target: 'Claude IDE Cursor',
                            status: 'success',
                            path: CLAUDE_IDE_CURSOR_PATH,
                            backup: backupResult
                        });
                    } catch (err) {
                        results.push({ target: 'Claude IDE Cursor', status: 'error', error: err.message });
                    }
                }

                res.writeHead(200, corsHeaders);
                res.end(JSON.stringify({ success: true, results }));
                
                console.log(`✅ Configs saved successfully to ${target}`);
                
            } catch (err) {
                res.writeHead(400, corsHeaders);
                res.end(JSON.stringify({ success: false, error: err.message }));
                console.error('❌ Error saving config:', err);
            }
        });
        return;
    }
    
    // API: Get current settings
    if (req.url === '/api/settings' && req.method === 'GET') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ 
            port: CONFIG.port,
            maxBackups: CONFIG.maxBackups,
            paths: CONFIG.paths
        }));
        return;
    }
    
    // API: Get hostname
    if (req.url === '/api/hostname' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
            hostname: os.hostname(),
            platform: os.platform(),
            type: os.type()
        }));
        return;
    }
    
    // API: Update settings
    if (req.url === '/api/settings' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const newSettings = JSON.parse(body);
                
                // Update paths if provided
                if (newSettings.paths) {
                    if (newSettings.paths.claudeCode) {
                        CONFIG.paths.claudeCode = newSettings.paths.claudeCode;
                        // Update the backward compatibility variable
                        CLAUDE_CODE_PATH = CONFIG.paths.claudeCode;
                    }
                    if (newSettings.paths.claudeDesktop) {
                        CONFIG.paths.claudeDesktop = newSettings.paths.claudeDesktop;
                        // Update the backward compatibility variable
                        CLAUDE_DESKTOP_PATH = CONFIG.paths.claudeDesktop;
                    }
                    if (newSettings.paths.cursor) {
                        CONFIG.paths.cursor = newSettings.paths.cursor;
                        // Update the backward compatibility variable
                        CURSOR_PATH = CONFIG.paths.cursor;
                    }
                    if (newSettings.paths.claudeIdeCursor) {
                        CONFIG.paths.claudeIdeCursor = newSettings.paths.claudeIdeCursor;
                        // Update the backward compatibility variable
                        CLAUDE_IDE_CURSOR_PATH = CONFIG.paths.claudeIdeCursor;
                    }
                }
                
                // Update maxBackups if provided
                if (newSettings.maxBackups !== undefined) {
                    CONFIG.maxBackups = parseInt(newSettings.maxBackups);
                }
                
                res.writeHead(200, corsHeaders);
                res.end(JSON.stringify({ 
                    success: true, 
                    settings: {
                        port: CONFIG.port,
                        maxBackups: CONFIG.maxBackups,
                        paths: CONFIG.paths
                    }
                }));
                
                console.log('✅ Settings updated successfully');
            } catch (err) {
                res.writeHead(400, corsHeaders);
                res.end(JSON.stringify({ success: false, error: err.message }));
                console.error('❌ Error updating settings:', err);
            }
        });
        return;
    }
    
    // API: Check server status
    if (req.url === '/api/status' && req.method === 'GET') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ 
            status: 'running',
            version: '1.0.0',
            capabilities: ['direct-save'],
            paths: CONFIG.paths,
            port: CONFIG.port,
            maxBackups: CONFIG.maxBackups
        }));
        return;
    }
    
    // Serve static files
    let filePath = req.url === '/' ? 'index.html' : req.url.substring(1);
    
    // Remove query parameters
    filePath = filePath.split('?')[0];
    
    // Security: prevent directory traversal
    if (filePath.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // Build full path
    const fullPath = path.join(SERVER_DIR, filePath);
    
    // Check if file exists
    fs.stat(fullPath, (err, stats) => {
        if (err || !stats.isFile()) {
            console.log(`404 Not Found: ${filePath}`);
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        
        // Determine content type
        const ext = path.extname(fullPath);
        const contentTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.ico': 'image/x-icon'
        };
        const contentType = contentTypes[ext] || 'text/plain';
        
        // Serve file
        fs.readFile(fullPath, (err, content) => {
            if (err) {
                console.error(`Error reading file ${fullPath}:`, err);
                res.writeHead(500);
                res.end('Server error');
                return;
            }
            
            console.log(`Serving: ${filePath} (${contentType})`);
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content);
        });
    });
});

// Start server
server.listen(PORT, () => {
    console.log('╔══════════════════════════════════════╗');
    console.log('║   MCP Config Server (Advanced)      ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log('');
    console.log('🚀 Features:');
    console.log('   • Serve web interface');
    console.log('   • Direct save to Claude configs');
    console.log('   • Automatic backup');
    console.log('   • CORS enabled');
    console.log('');
    console.log('📍 Config paths:');
    console.log(`   Claude Code CLI:     ${CLAUDE_CODE_PATH}`);
    console.log(`   Claude Desktop:      ${CLAUDE_DESKTOP_PATH}`);
    console.log(`   Cursor:              ${CURSOR_PATH}`);
    console.log(`   Claude IDE Cursor:   ${CLAUDE_IDE_CURSOR_PATH}`);
    console.log('');
    console.log('Press Ctrl+C to stop\n');
    
    // Open browser after 1 second
    setTimeout(() => {
        const { exec } = require('child_process');
        exec(`start http://localhost:${PORT}`);
    }, 1000);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped');
    process.exit(0);
});