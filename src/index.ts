import { login, logout, setupClient } from './client.js';
import { setupTrackManagers } from './track-manager.js';

async function main() {
    try {
        await setupClient();
        await login();
        setupTrackManagers();
        console.info('Client logged in successfully.');
    } catch (error) {
        console.error(error);
        await logout();
        process.exit(1);
    }
}

main();
