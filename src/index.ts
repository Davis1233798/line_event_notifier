import express, { Request, Response, NextFunction } from 'express';
import { middleware, WebhookEvent, MiddlewareConfig } from '@line/bot-sdk';
import { config, validateConfig } from './config.js';
import { handleWebhookEvent } from './handlers/webhook.js';
import { handleSchedulerTrigger } from './handlers/scheduler.js';

// 驗證環境設定
validateConfig();

// 建立 Express 應用
const app = express();

// LINE Webhook 中介軟體設定
const middlewareConfig: MiddlewareConfig = {
    channelSecret: config.lineChannelSecret,
};

// 健康檢查端點
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// Cloud Scheduler 觸發端點
app.post('/trigger-reminder', express.json(), async (_req: Request, res: Response) => {
    console.log('Scheduler trigger received');

    try {
        const result = await handleSchedulerTrigger();

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Processed ${result.groupsProcessed} groups`,
            });
        } else {
            res.status(207).json({
                success: false,
                message: `Processed ${result.groupsProcessed} groups with errors`,
                errors: result.errors,
            });
        }
    } catch (error) {
        console.error('Scheduler trigger error:', error);
        res.status(500).json({
            success: false,
            error: String(error),
        });
    }
});

// LINE Webhook 端點
app.post(
    '/webhook',
    middleware(middlewareConfig),
    async (req: Request, res: Response) => {
        const events: WebhookEvent[] = req.body.events;
        console.log(`Received ${events.length} webhook events`);

        // 非同步處理事件，立即回應 LINE Platform
        Promise.all(
            events.map(async (event) => {
                try {
                    await handleWebhookEvent(event);
                } catch (error) {
                    console.error('Error handling webhook event:', error);
                }
            })
        );

        res.status(200).json({ success: true });
    }
);

// 錯誤處理
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// 啟動伺服器
const port = config.port;
app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📍 Webhook URL: http://localhost:${port}/webhook`);
    console.log(`📍 Scheduler URL: http://localhost:${port}/trigger-reminder`);
    console.log(`📍 Health check: http://localhost:${port}/health`);
});
