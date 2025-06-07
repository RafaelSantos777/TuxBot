export interface Track {
    url: string;
    name: string;
    durationMilliseconds: number;
    formattedDuration: string;
    startTimeMilliseconds: number;
    retryAttempts: number;
}
