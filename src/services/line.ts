import {
    Client,
    ClientConfig,
    TextMessage,
    Message,
    WebhookEvent,
    MessageAPIResponseBase,
} from '@line/bot-sdk';
import { config } from '../config.js';

// LINE Client 實例
let lineClient: Client | null = null;

/**
 * 取得 LINE Client 實例（單例模式）
 */
export function getLineClient(): Client {
    if (!lineClient) {
        const clientConfig: ClientConfig = {
            channelAccessToken: config.lineChannelAccessToken,
        };
        lineClient = new Client(clientConfig);
    }
    return lineClient;
}

/**
 * 回覆訊息
 */
export async function replyMessage(
    replyToken: string,
    messages: Message | Message[]
): Promise<MessageAPIResponseBase> {
    const client = getLineClient();
    const messageArray = Array.isArray(messages) ? messages : [messages];
    return client.replyMessage(replyToken, messageArray);
}

/**
 * 主動推送訊息（Push Message）
 */
export async function pushMessage(
    to: string,
    messages: Message | Message[]
): Promise<MessageAPIResponseBase> {
    const client = getLineClient();
    const messageArray = Array.isArray(messages) ? messages : [messages];
    return client.pushMessage(to, messageArray);
}

/**
 * 建立文字訊息
 */
export function createTextMessage(text: string): TextMessage {
    return {
        type: 'text',
        text,
    };
}

/**
 * 取得群組成員 ID 列表
 */
export async function getGroupMemberIds(groupId: string): Promise<string[]> {
    const client = getLineClient();
    // LINE SDK v9 的 getGroupMemberIds 直接回傳 string[]
    return client.getGroupMemberIds(groupId);
}

/**
 * 取得群組成員資料
 */
export async function getGroupMemberProfile(
    groupId: string,
    userId: string
): Promise<{ displayName: string; userId: string; pictureUrl?: string }> {
    const client = getLineClient();
    return client.getGroupMemberProfile(groupId, userId);
}

/**
 * 取得群組摘要資訊
 */
export async function getGroupSummary(
    groupId: string
): Promise<{ groupId: string; groupName: string; pictureUrl?: string }> {
    const client = getLineClient();
    return client.getGroupSummary(groupId);
}

/**
 * 檢查訊息是否 mention 了機器人
 */
export function isBotMentioned(event: WebhookEvent): boolean {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return false;
    }

    const mention = event.message.mention;
    if (!mention?.mentionees) {
        return false;
    }

    // 檢查是否有 mention 機器人（type = 'all' 或特定 userId）
    // 注意：LINE Bot 被 mention 時，mentionee.type 通常是 'user'
    // 可以透過比對 userId 或檢查 type
    // 檢查是否有人 mention（實際上 LINE API 不直接支援辨識 bot 被 mention）
    // 這裡我們假設只要訊息包含 mention 就處理
    return mention.mentionees.length > 0;
}

/**
 * 從事件中取得群組 ID
 */
export function getGroupId(event: WebhookEvent): string | null {
    if ('source' in event && event.source.type === 'group') {
        return event.source.groupId;
    }
    return null;
}

/**
 * 從事件中取得使用者 ID
 */
export function getUserId(event: WebhookEvent): string | null {
    if ('source' in event && 'userId' in event.source) {
        return event.source.userId || null;
    }
    return null;
}

/**
 * 格式化活動提醒訊息
 */
export function formatReminderMessage(
    events: Array<{
        date: Date;
        type: string;
        volunteers: string[];
        volunteerNames: Map<string, string>; // displayName -> LINE 名稱
    }>
): string {
    if (events.length === 0) {
        return '📅 下週沒有安排活動';
    }

    const lines = ['📢 下週活動提醒：', ''];

    for (const event of events) {
        const dateStr = formatDateForMessage(event.date);
        const volunteerList = event.volunteers.length > 0
            ? event.volunteers.map(v => {
                const lineName = event.volunteerNames.get(v);
                return lineName ? `${v}（${lineName}）` : v;
            }).join('、')
            : '（尚未安排）';

        lines.push(`🔸 ${dateStr} ${event.type}`);
        lines.push(`   負責人：${volunteerList}`);
        lines.push('');
    }

    lines.push('請相關人員記得出席！🙏');

    return lines.join('\n');
}

/**
 * 格式化日期用於訊息顯示
 */
function formatDateForMessage(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const dayOfWeek = dayNames[date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
}
