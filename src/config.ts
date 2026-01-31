import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // LINE
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    lineChannelSecret: process.env.LINE_CHANNEL_SECRET || '',

    // GCP
    gcpProjectId: process.env.GCP_PROJECT_ID || '',

    // Server
    port: parseInt(process.env.PORT || '8080', 10),

    // 時區
    timezone: process.env.TZ || 'Asia/Taipei',
} as const;

// 驗證必要環境變數
export function validateConfig(): void {
    const required = [
        'lineChannelAccessToken',
        'lineChannelSecret',
    ] as const;

    for (const key of required) {
        if (!config[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
    }
}
