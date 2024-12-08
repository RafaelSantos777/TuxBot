import { login, logout, setupClient } from './client.js';
import { setupVoiceManager } from './voice-manager.js';

async function main() {
    try {
        await setupClient();
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
