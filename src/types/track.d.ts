export interface Track {
    url: string;
    name: string;
    durationSeconds: number;
    formattedDuration: string;
    startTimeSeconds: number;
    retryAttempts: number;
}
