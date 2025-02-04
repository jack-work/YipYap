import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function installHotkeyScript() {
    // Only proceed on Windows
    if (process.platform !== 'win32') {
        console.log('Not running on Windows, skipping AutoHotkey script installation.');
        return;
    }

    try {
        // Get Windows Startup folder path
        const startupFolder = join(homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
        
        // Source and destination paths
        const sourceFile = join(__dirname, '..', 'hotkey.ahk');
        const destFile = join(startupFolder, 'yipyap-hotkey.ahk');

        // Check if source file exists
        if (!existsSync(sourceFile)) {
            console.log('AutoHotkey script not found, skipping installation.');
            return;
        }

        // Copy the file
        copyFileSync(sourceFile, destFile);
        console.log('Successfully installed YipYap AutoHotkey script to Windows Startup folder.');

    } catch (error) {
        console.error('Failed to install AutoHotkey script:', error.message);
    }
}

installHotkeyScript();
