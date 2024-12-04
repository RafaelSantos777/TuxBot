import { deployCommands, login, logout, setupCommands, setupEventHandlers } from './client.js';
import { setupVoiceManager } from './voice-manager.js';

async function main() {
    try {
        await setupCommands();
        await deployCommands();
        setupEventHandlers();
        await login();
        setupVoiceManager();
        console.log('Client logged in successfully.');
    } catch (error) {
        console.error(error);
        await logout();
        process.exit(1);
    }
}

main();