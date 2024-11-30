import { deployCommands, login, setupCommands, setupEventHandlers } from './client.js';
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
        process.exit(1);
    }
}

main();