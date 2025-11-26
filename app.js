// MCPilot - GitHub API Version
// Uses GitHub API for reliable, cache-free data access

// Configuration
const CONFIG = {
    gistId: localStorage.getItem('gistId') || '',
    githubToken: localStorage.getItem('githubToken') || '',
    fileName: 'mcp.txt',
    // Path settings
    paths: {
        claudeDesktop: localStorage.getItem('claudeDesktopPath') || '',
        claudeCode: localStorage.getItem('claudeCodePath') || '',
        cursor: localStorage.getItem('cursorPath') || ''
    },
    maxBackups: parseInt(localStorage.getItem('maxBackups')) || 10
};

// Global state
let mcpConfig = { 
    mcpServers: {},
    version: null,
    lastModified: null
};
let editingServer = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('MCPilot - GitHub API Version');
    console.log('=====================================');
    
    // First update UI to ensure DOM is ready
    updateUI();
    
    // Check for advanced server
    const hasAdvancedServer = await checkAdvancedServer();
    if (hasAdvancedServer) {
        console.log('✅ Advanced server detected - direct save enabled');
        showToast('🚀 Advanced server running - direct save enabled!', 'success');
        updateServerStatus(true);
    } else {
        console.log('ℹ️ Advanced server not running - using download fallback');
        updateServerStatus(false);
    }
    
    // Check for stored credentials
    if (!CONFIG.githubToken) {
        console.log('No GitHub token configured - opening settings');
        showSettingsModal();
        showToast('⚙️ Please configure GitHub settings first', 'warning');
        
        // Show helpful message
        const container = document.getElementById('serversList');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow p-8 text-center">
                    <h3 class="text-lg font-semibold text-yellow-800 mb-2">⚠️ GitHub Configuration Required</h3>
                    <p class="text-yellow-700 mb-4">Please configure your GitHub token to load data from GIST</p>
                    <ol class="text-left max-w-md mx-auto text-yellow-700">
                        <li>1. Click the gear icon (⚙️) in the header</li>
                        <li>2. Enter your GitHub Personal Access Token</li>
                        <li>3. Make sure the token has 'gist' scope</li>
                        <li>4. Click Save Settings</li>
                        <li>5. Then click "Load from Gist"</li>
                    </ol>
                    <div class="mt-4 p-3 bg-yellow-100 rounded">
                        <p class="text-sm text-yellow-800">
                            <strong>Note:</strong> Your token will be saved locally and used for all future sessions.
                        </p>
                    </div>
                </div>
            `;
        }
    } else {
        console.log('Token found, loading from GIST...');
        // Auto-load on startup
        loadFromGist();
    }
});

// Load from Gist using GitHub API
async function loadFromGist() {
    if (!CONFIG.githubToken) {
        showToast('Please configure GitHub token in settings', 'error');
        showSettingsModal();
        return;
    }
    
    console.log('Loading from GIST via GitHub API...');
    console.log('Using Gist ID:', CONFIG.gistId);
    console.log('Token present:', CONFIG.githubToken ? 'Yes' : 'No');
    showToast('Loading from GIST...', 'info');
    
    try {
        // Use GitHub API for guaranteed fresh data
        // Add timestamp to URL to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`https://api.github.com/gists/${CONFIG.gistId}?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.githubToken}`,  // Use Bearer instead of token
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid GitHub token. Please check settings.');
            } else if (response.status === 404) {
                throw new Error('Gist not found. Please check the Gist ID.');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        
        const gistData = await response.json();
        
        // Get the file content
        if (!gistData.files || !gistData.files[CONFIG.fileName]) {
            throw new Error(`File '${CONFIG.fileName}' not found in gist`);
        }
        
        const fileContent = gistData.files[CONFIG.fileName].content;
        const config = JSON.parse(fileContent);
        
        // Store the config
        mcpConfig = config;
        
        // Extract metadata
        const serverCount = Object.keys(config.mcpServers || {}).length;
        const lastModified = new Date(gistData.updated_at).toLocaleString();
        
        // Display version info if available
        let versionMsg = `Loaded ${serverCount} servers`;
        if (config.version) {
            versionMsg += ` (v${config.version})`;
        }
        
        console.log(`✅ ${versionMsg}`);
        console.log(`Last modified: ${lastModified}`);
        
        showToast(`✅ ${versionMsg}`, 'success');
        
        // Update version display
        updateVersionInfo(config.version, lastModified);
        
        updateUI();
        
    } catch (error) {
        console.error('Failed to load from GIST:', error);
        showToast(`Failed to load: ${error.message}`, 'error');
    }
}

// Save to Gist using GitHub API
async function saveToGist() {
    if (!CONFIG.githubToken) {
        showToast('Please configure GitHub token in settings', 'error');
        showSettingsModal();
        return;
    }
    
    try {
        showToast('Saving to Gist...', 'info');
        
        // Add version and timestamp
        mcpConfig.version = mcpConfig.version ? (parseFloat(mcpConfig.version) + 0.1).toFixed(1) : '1.0';
        mcpConfig.lastModified = new Date().toISOString();
        mcpConfig.modifiedBy = await getDeviceName();
        
        const configJson = JSON.stringify(mcpConfig, null, 2);
        
        // Update gist via GitHub API
        const response = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CONFIG.githubToken}`,  // Use Bearer instead of token
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [CONFIG.fileName]: {
                        content: configJson
                    }
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const updatedGist = await response.json();
        
        showToast(`✅ Configuration saved (v${mcpConfig.version})`, 'success');
        
        // Update version display
        updateVersionInfo(mcpConfig.version, new Date().toLocaleString());
        
        // Reload after save to ensure sync
        setTimeout(() => {
            loadFromGist();
        }, 1000);
        
    } catch (error) {
        console.error('Save to Gist failed:', error);
        showToast(`Failed to save: ${error.message}`, 'error');
    }
}

// Settings Modal Functions
async function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const tokenInput = document.getElementById('githubToken');
    const gistInput = document.getElementById('gistId');
    const desktopPathInput = document.getElementById('claudeDesktopPath');
    const codePathInput = document.getElementById('claudeCodePath');
    const cursorPathInput = document.getElementById('cursorPath');
    const maxBackupsInput = document.getElementById('maxBackups');

    // Load existing values
    tokenInput.value = CONFIG.githubToken;
    gistInput.value = CONFIG.gistId;
    desktopPathInput.value = CONFIG.paths.claudeDesktop;
    codePathInput.value = CONFIG.paths.claudeCode;
    cursorPathInput.value = CONFIG.paths.cursor;
    maxBackupsInput.value = CONFIG.maxBackups || 10;

    // Try to load current settings from server if available
    const hasAdvanced = await checkAdvancedServer();
    if (hasAdvanced) {
        try {
            const response = await fetch('http://localhost:8080/api/settings');
            const settings = await response.json();

            // If server paths are different and local storage is empty, use server paths
            if (!CONFIG.paths.claudeDesktop && settings.paths?.claudeDesktop) {
                desktopPathInput.value = settings.paths.claudeDesktop;
            }
            if (!CONFIG.paths.claudeCode && settings.paths?.claudeCode) {
                codePathInput.value = settings.paths.claudeCode;
            }
            if (!CONFIG.paths.cursor && settings.paths?.cursor) {
                cursorPathInput.value = settings.paths.cursor;
            }
            if (!localStorage.getItem('maxBackups') && settings.maxBackups) {
                maxBackupsInput.value = settings.maxBackups;
            }
        } catch (error) {
            console.log('Could not load server settings:', error.message);
        }
    }

    modal.classList.add('show');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

async function saveSettings() {
    const tokenInput = document.getElementById('githubToken');
    const gistInput = document.getElementById('gistId');
    const desktopPathInput = document.getElementById('claudeDesktopPath');
    const codePathInput = document.getElementById('claudeCodePath');
    const cursorPathInput = document.getElementById('cursorPath');
    const maxBackupsInput = document.getElementById('maxBackups');

    // Save to localStorage
    localStorage.setItem('githubToken', tokenInput.value.trim());
    localStorage.setItem('gistId', gistInput.value.trim());
    localStorage.setItem('claudeDesktopPath', desktopPathInput.value.trim());
    localStorage.setItem('claudeCodePath', codePathInput.value.trim());
    localStorage.setItem('cursorPath', cursorPathInput.value.trim());
    localStorage.setItem('maxBackups', maxBackupsInput.value || '10');

    // Update CONFIG
    CONFIG.githubToken = tokenInput.value.trim();
    CONFIG.gistId = gistInput.value.trim();
    CONFIG.paths.claudeDesktop = desktopPathInput.value.trim();
    CONFIG.paths.claudeCode = codePathInput.value.trim();
    CONFIG.paths.cursor = cursorPathInput.value.trim();
    CONFIG.maxBackups = parseInt(maxBackupsInput.value) || 10;

    // Update server settings if available
    const hasAdvanced = await checkAdvancedServer();
    if (hasAdvanced) {
        try {
            const response = await fetch('http://localhost:8080/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paths: {
                        claudeDesktop: CONFIG.paths.claudeDesktop || undefined,
                        claudeCode: CONFIG.paths.claudeCode || undefined,
                        cursor: CONFIG.paths.cursor || undefined
                    },
                    maxBackups: CONFIG.maxBackups
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update server settings');
            }

            console.log('✅ Server settings updated');
        } catch (error) {
            console.error('Could not update server settings:', error);
            showToast('Settings saved locally (server update failed)', 'warning');
        }
    }

    closeSettingsModal();
    showToast('Settings saved', 'success');

    // Auto-load with new settings
    if (CONFIG.githubToken && CONFIG.gistId) {
        loadFromGist();
    }
}

// Version Info Display
function updateVersionInfo(version, lastModified) {
    const versionDiv = document.getElementById('versionInfo');
    if (versionDiv) {
        if (version || lastModified) {
            versionDiv.innerHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded p-2">
                    <p class="text-xs text-blue-700">
                        ${version ? `<strong>Version:</strong> ${version} | ` : ''}
                        ${lastModified ? `<strong>Last Modified:</strong> ${lastModified}` : ''}
                        ${mcpConfig.modifiedBy ? ` | <strong>By:</strong> ${mcpConfig.modifiedBy}` : ''}
                    </p>
                </div>
            `;
        } else {
            versionDiv.innerHTML = '';
        }
    }
}

// UI Functions
async function updateUI() {
    renderServers();
    
    const servers = mcpConfig.mcpServers || {};
    const serverCount = Object.keys(servers).length;
    let activeCount = 0;
    let disabledCount = 0;
    
    Object.values(servers).forEach(server => {
        if (server.enabled !== false) {
            activeCount++;
        } else {
            disabledCount++;
        }
    });
    
    // Update counters
    document.getElementById('serverCount').textContent = serverCount;
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('disabledCount').textContent = disabledCount;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
    document.getElementById('hostname').textContent = await getDeviceName();
    
    // Update status indicator
    const indicator = document.getElementById('configStatus');
    if (indicator) {
        indicator.className = serverCount > 0 ? 'status-indicator status-synced' : 'status-indicator status-inactive';
    }
    
    // Update Gist info - but preserve server status if it was already set
    const gistInfoDiv = document.getElementById('gistInfo');
    if (gistInfoDiv && CONFIG.gistId) {
        // Check if we already have server status info
        const hasServerStatus = gistInfoDiv.innerHTML.includes('Direct Save') || gistInfoDiv.innerHTML.includes('Download Mode');
        
        if (!hasServerStatus) {
            // Only update if server status wasn't set yet
            gistInfoDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded p-2">
                    <p class="text-xs text-green-700">
                        <strong>GitHub API Mode</strong> | 
                        <strong>Gist ID:</strong> ${CONFIG.gistId} | 
                        <strong>Status:</strong> Connected
                    </p>
                </div>
            `;
        }
    }
}

function renderServers() {
    const container = document.getElementById('serversList');
    if (!container) return;
    
    const servers = mcpConfig.mcpServers || {};
    const serverCount = Object.keys(servers).length;
    
    if (serverCount === 0) {
        container.innerHTML = `
            <div class="col-span-full bg-white rounded-lg shadow p-8 text-center">
                <h3 class="text-lg font-semibold text-gray-600 mb-2">No servers configured</h3>
                <p class="text-gray-500 mb-4">Load from GIST or add a new server to get started</p>
                <button onclick="showAddServerModal()" class="bg-green-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>Add Server
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    Object.entries(servers).forEach(([name, server]) => {
        const card = document.createElement('div');
        const isEnabled = server.enabled !== false;
        
        card.className = `bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow ${isEnabled ? '' : 'opacity-50'}`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center">
                    <span class="w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-400'} mr-2"></span>
                </div>
                <div class="flex items-center space-x-1">
                    <button onclick="editServer('${name}')" class="p-1 rounded hover:bg-gray-100" title="Edit">
                        <i class="fas fa-edit text-blue-600"></i>
                    </button>
                    <button onclick="toggleServer('${name}')" class="p-1 rounded hover:bg-gray-100" title="${isEnabled ? 'Disable' : 'Enable'}">
                        <i class="fas fa-power-off ${isEnabled ? 'text-green-600' : 'text-gray-400'}"></i>
                    </button>
                    <button onclick="deleteServer('${name}')" class="p-1 rounded hover:bg-gray-100" title="Delete">
                        <i class="fas fa-trash text-red-600"></i>
                    </button>
                </div>
            </div>
            <h4 class="font-bold text-lg text-gray-800 mb-2">${name}</h4>
            <div class="text-xs font-mono text-gray-600 bg-gray-100 p-2 rounded">
                ${server.command} ${server.args ? server.args.join(' ') : ''}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Server Management Functions
function showAddServerModal() {
    editingServer = null;
    
    // Reset form
    document.getElementById('serverName').value = '';
    document.getElementById('serverName').disabled = false;
    document.getElementById('commandType').value = 'npx';
    document.getElementById('command').value = 'npx';
    document.getElementById('packageName').value = '';
    document.getElementById('args').value = '';
    document.getElementById('serverEnabled').checked = true;
    document.getElementById('envVars').innerHTML = '';
    document.getElementById('modalTitle').textContent = 'Add New Server';
    
    updateCommandFields();
    
    document.getElementById('serverModal').classList.add('show');
}

function editServer(serverName) {
    if (!mcpConfig.mcpServers || !mcpConfig.mcpServers[serverName]) {
        showToast('Server not found', 'error');
        return;
    }
    
    editingServer = serverName;
    const server = mcpConfig.mcpServers[serverName];
    
    // Populate form
    document.getElementById('serverName').value = serverName;
    document.getElementById('serverName').disabled = true;
    document.getElementById('serverEnabled').checked = server.enabled !== false;
    document.getElementById('modalTitle').textContent = 'Edit Server';
    
    // Determine command type
    const command = server.command;
    let commandType = 'custom';
    if (command === 'npx') commandType = 'npx';
    else if (command === 'node') commandType = 'node';
    else if (command === 'python' || command === 'python3') commandType = 'python';
    else if (command === 'docker') commandType = 'docker';
    else if (command === 'uvx') commandType = 'uvx';
    
    document.getElementById('commandType').value = commandType;
    document.getElementById('command').value = command;
    
    // Handle args
    if (server.args && server.args.length > 0) {
        if (commandType === 'npx' || commandType === 'uvx' || commandType === 'node' || commandType === 'python') {
            document.getElementById('packageName').value = server.args[0] || '';
            const remainingArgs = server.args.slice(1).join('\n');
            document.getElementById('args').value = remainingArgs;
        } else {
            document.getElementById('args').value = server.args.join('\n');
        }
    } else {
        document.getElementById('packageName').value = '';
        document.getElementById('args').value = '';
    }
    
    // Handle environment variables
    const envContainer = document.getElementById('envVars');
    envContainer.innerHTML = '';
    if (server.env) {
        Object.entries(server.env).forEach(([key, value]) => {
            addEnvVar(key, value);
        });
    }
    
    updateCommandFields();
    
    document.getElementById('serverModal').classList.add('show');
}

function saveServer(e) {
    e.preventDefault();
    
    const serverName = document.getElementById('serverName').value.trim();
    const commandType = document.getElementById('commandType').value;
    const command = document.getElementById('command').value.trim();
    const packageName = document.getElementById('packageName').value.trim();
    const argsText = document.getElementById('args').value.trim();
    const enabled = document.getElementById('serverEnabled').checked;
    
    if (!serverName || !command) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    // Initialize mcpServers if not exists
    if (!mcpConfig.mcpServers) {
        mcpConfig.mcpServers = {};
    }
    
    // Build server config
    const serverConfig = {
        command: command,
        enabled: enabled
    };
    
    // Add package/script if needed
    if ((commandType === 'npx' || commandType === 'uvx') && packageName) {
        serverConfig.args = [packageName];
        if (argsText) {
            const additionalArgs = argsText.split('\n').filter(arg => arg.trim());
            serverConfig.args.push(...additionalArgs);
        }
    } else if ((commandType === 'node' || commandType === 'python') && packageName) {
        serverConfig.args = [packageName];
        if (argsText) {
            const additionalArgs = argsText.split('\n').filter(arg => arg.trim());
            serverConfig.args.push(...additionalArgs);
        }
    } else if (argsText) {
        serverConfig.args = argsText.split('\n').filter(arg => arg.trim());
    }
    
    // Add environment variables
    const envVarsContainer = document.getElementById('envVars');
    const envInputs = envVarsContainer.querySelectorAll('.env-var-row');
    if (envInputs.length > 0) {
        serverConfig.env = {};
        envInputs.forEach(row => {
            const key = row.querySelector('.env-key').value.trim();
            const value = row.querySelector('.env-value').value.trim();
            if (key) {
                serverConfig.env[key] = value;
            }
        });
    }
    
    // Save to config
    mcpConfig.mcpServers[serverName] = serverConfig;
    
    // Update UI and close modal
    updateUI();
    closeModal();
    showToast(`Server '${serverName}' ${editingServer ? 'updated' : 'added'}`, 'success');
}

function deleteServer(serverName) {
    if (confirm(`Delete server '${serverName}'? This cannot be undone.`)) {
        delete mcpConfig.mcpServers[serverName];
        updateUI();
        showToast(`Server '${serverName}' deleted`, 'success');
    }
}

function toggleServer(serverName) {
    if (mcpConfig.mcpServers && mcpConfig.mcpServers[serverName]) {
        const server = mcpConfig.mcpServers[serverName];
        server.enabled = server.enabled !== false ? false : true;
        updateUI();
        showToast(`Server '${serverName}' ${server.enabled ? 'enabled' : 'disabled'}`, 'success');
    }
}

function closeModal() {
    document.getElementById('serverModal').classList.remove('show');
    editingServer = null;
}

function updateCommandFields() {
    const commandType = document.getElementById('commandType').value;
    const packageField = document.getElementById('packageField');
    const commandInput = document.getElementById('command');
    
    // Show/hide package field based on command type
    if (commandType === 'npx' || commandType === 'uvx' || commandType === 'node' || commandType === 'python') {
        packageField.style.display = 'block';
    } else {
        packageField.style.display = 'none';
    }
    
    // Set default command based on type
    if (!editingServer) {
        switch(commandType) {
            case 'npx':
                commandInput.value = 'npx';
                break;
            case 'node':
                commandInput.value = 'node';
                break;
            case 'python':
                commandInput.value = 'python';
                break;
            case 'docker':
                commandInput.value = 'docker';
                break;
            case 'uvx':
                commandInput.value = 'uvx';
                break;
            case 'custom':
                commandInput.value = '';
                break;
        }
    }
}

function addEnvVar(key = '', value = '') {
    const envContainer = document.getElementById('envVars');
    const envRow = document.createElement('div');
    envRow.className = 'env-var-row flex space-x-2';
    envRow.innerHTML = `
        <input type="text" placeholder="Variable name" value="${key}" class="env-key flex-1 px-2 py-1 border rounded text-sm">
        <input type="text" placeholder="Value" value="${value}" class="env-value flex-1 px-2 py-1 border rounded text-sm">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800">
            <i class="fas fa-times"></i>
        </button>
    `;
    envContainer.appendChild(envRow);
}

// Check if advanced server is running
async function checkAdvancedServer() {
    try {
        const response = await fetch('http://localhost:8080/api/status');
        if (response.ok) {
            const status = await response.json();
            return status.capabilities && status.capabilities.includes('direct-save');
        }
    } catch (e) {
        // Server not running
    }
    return false;
}

// Save directly via advanced server
async function saveDirectly(target) {
    if (!mcpConfig.mcpServers || Object.keys(mcpConfig.mcpServers).length === 0) {
        showToast('No servers loaded yet!', 'error');
        return;
    }
    
    try {
        showToast(`Saving directly to ${target}...`, 'info');
        
        const response = await fetch('http://localhost:8080/api/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                config: mcpConfig,
                target: target
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            let message = '✅ Saved successfully!\n\n';
            let backupCount = 0;
            
            result.results.forEach(r => {
                if (r.status === 'success') {
                    message += `📁 ${r.target}\n`;
                    if (r.backup && r.backup.backup) {
                        message += `   💾 Backup created\n`;
                        backupCount++;
                    }
                }
            });
            
            if (backupCount > 0) {
                message += `\n🔒 ${backupCount} backup(s) created in 'backups' folder`;
            }
            
            showToast(message.trim(), 'success');
            console.log('Direct save results:', result.results);
            
            // Show detailed info in console
            result.results.forEach(r => {
                if (r.backup && r.backup.path) {
                    console.log(`Backup created: ${r.backup.path}`);
                }
            });
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Direct save failed, falling back to download:', error);
        // Fallback to download
        const config = generateCleanConfig();
        if (target === 'desktop') {
            downloadConfig(config, 'claude_desktop_config.json');
            showToast('Advanced server not running - downloading instead', 'warning');
        } else if (target === 'code') {
            downloadConfig(config, 'claude.json');
            showToast('Advanced server not running - downloading instead', 'warning');
        } else if (target === 'cursor') {
            downloadConfig(config, 'mcp.json');
            showToast('Advanced server not running - downloading instead', 'warning');
        } else if (target === 'both') {
            downloadConfig(config, 'claude_desktop_config.json');
            setTimeout(() => {
                downloadConfig(config, 'claude.json');
            }, 500);
            showToast('Advanced server not running - downloading instead', 'warning');
        } else if (target === 'all') {
            downloadConfig(config, 'claude_desktop_config.json');
            setTimeout(() => {
                downloadConfig(config, 'claude.json');
            }, 500);
            setTimeout(() => {
                downloadConfig(config, 'mcp.json');
            }, 1000);
            showToast('Advanced server not running - downloading instead', 'warning');
        }
    }
}

// Download functions (with direct save attempt first)
async function applyToClaudeDesktop() {
    // Try direct save first
    const hasAdvancedServer = await checkAdvancedServer();
    if (hasAdvancedServer) {
        await saveDirectly('desktop');
    } else {
        // Fallback to download
        if (!mcpConfig.mcpServers || Object.keys(mcpConfig.mcpServers).length === 0) {
            showToast('No servers loaded yet!', 'error');
            return;
        }
        const config = generateCleanConfig();
        downloadConfig(config, 'claude_desktop_config.json');
        showToast('Downloading Claude Desktop config...', 'success');
    }
}

async function applyToClaudeCode() {
    // Try direct save first
    const hasAdvancedServer = await checkAdvancedServer();
    if (hasAdvancedServer) {
        await saveDirectly('code');
    } else {
        // Fallback to download
        if (!mcpConfig.mcpServers || Object.keys(mcpConfig.mcpServers).length === 0) {
            showToast('No servers loaded yet!', 'error');
            return;
        }
        const config = generateCleanConfig();
        downloadConfig(config, 'claude.json');
        showToast('Downloading Claude Code config...', 'success');
    }
}

async function applyToBoth() {
    // Try direct save first
    const hasAdvancedServer = await checkAdvancedServer();
    if (hasAdvancedServer) {
        await saveDirectly('both');
    } else {
        // Fallback to download
        if (!mcpConfig.mcpServers || Object.keys(mcpConfig.mcpServers).length === 0) {
            showToast('No servers loaded yet!', 'error');
            return;
        }
        const config = generateCleanConfig();
        downloadConfig(config, 'claude_desktop_config.json');
        setTimeout(() => {
            downloadConfig(config, 'claude.json');
        }, 500);
        showToast('Downloading both configs...', 'success');
    }
}

async function applyToCursor() {
    // Try direct save first
    const hasAdvancedServer = await checkAdvancedServer();
    if (hasAdvancedServer) {
        await saveDirectly('cursor');
    } else {
        // Fallback to download
        if (!mcpConfig.mcpServers || Object.keys(mcpConfig.mcpServers).length === 0) {
            showToast('No servers loaded yet!', 'error');
            return;
        }
        const config = generateCleanConfig();
        downloadConfig(config, 'mcp.json');
        showToast('Downloading Cursor config...', 'success');
    }
}

async function applyToAll() {
    // Try direct save first
    const hasAdvancedServer = await checkAdvancedServer();
    if (hasAdvancedServer) {
        await saveDirectly('all');
    } else {
        // Fallback to download
        if (!mcpConfig.mcpServers || Object.keys(mcpConfig.mcpServers).length === 0) {
            showToast('No servers loaded yet!', 'error');
            return;
        }
        const config = generateCleanConfig();
        downloadConfig(config, 'claude_desktop_config.json');
        setTimeout(() => {
            downloadConfig(config, 'claude.json');
        }, 500);
        setTimeout(() => {
            downloadConfig(config, 'mcp.json');
        }, 1000);
        showToast('Downloading all configs...', 'success');
    }
}

function generateCleanConfig() {
    const config = { mcpServers: {} };
    
    Object.entries(mcpConfig.mcpServers || {}).forEach(([name, server]) => {
        if (server.enabled !== false) {
            config.mcpServers[name] = {
                command: server.command,
                args: server.args || []
            };
            
            if (server.env && Object.keys(server.env).length > 0) {
                config.mcpServers[name].env = server.env;
            }
        }
    });
    
    return config;
}

function downloadConfig(config, filename) {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    
    toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300';
    
    switch(type) {
        case 'success':
            toast.className += ' bg-green-500 text-white';
            break;
        case 'error':
            toast.className += ' bg-red-500 text-white';
            break;
        case 'warning':
            toast.className += ' bg-yellow-500 text-white';
            break;
        case 'info':
            toast.className += ' bg-blue-500 text-white';
            break;
    }
    
    toast.classList.remove('translate-y-full');
    
    // Show longer for success messages with backups
    const duration = message.includes('backup') ? 5000 : 3000;
    setTimeout(() => toast.classList.add('translate-y-full'), duration);
}

// Utility Functions
async function getDeviceName() {
    // First try to get from server
    try {
        const response = await fetch('http://localhost:8080/api/hostname');
        if (response.ok) {
            const data = await response.json();
            if (data.hostname) {
                // Cache it for offline use
                localStorage.setItem('deviceName', data.hostname);
                return data.hostname;
            }
        }
    } catch (error) {
        console.log('Could not get hostname from server:', error.message);
    }
    
    // Fallback to cached value or default
    return localStorage.getItem('deviceName') || 'Unknown_Device';
}

// Update server status indicator
function updateServerStatus(isRunning) {
    const gistInfoDiv = document.getElementById('gistInfo');
    if (gistInfoDiv) {
        const serverStatus = isRunning ? 
            `<span class="text-green-600 font-bold">🚀 Direct Save Active</span>` : 
            `<span class="text-yellow-600">📥 Download Mode</span>`;
            
        const existingContent = gistInfoDiv.innerHTML;
        
        // If there's already content (from updateUI), append to it
        if (existingContent && CONFIG.gistId) {
            gistInfoDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded p-2">
                    <p class="text-xs text-green-700">
                        <strong>GitHub API Mode</strong> | 
                        <strong>Gist ID:</strong> ${CONFIG.gistId} | 
                        <strong>Mode:</strong> ${serverStatus}
                    </p>
                </div>
            `;
        } else {
            // Just show server status if no gist configured
            gistInfoDiv.innerHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded p-2">
                    <p class="text-xs text-blue-700">
                        <strong>Server Mode:</strong> ${serverStatus}
                    </p>
                </div>
            `;
        }
    }
}

// Version check on startup
window.addEventListener('load', () => {
    console.log('MCPilot loaded successfully');
    console.log('Using GitHub API for guaranteed fresh data');
});