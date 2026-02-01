import { WebhookEvent } from '@line/bot-sdk';

// ============ 活動相關 ============

/** 活動類型 */
export type EventType = '共修' | '法會' | '悠遊普思' | '新春法會' | string;

/** 單一活動項目 */
export interface ScheduleEvent {
    date: Date;
    dayOfWeek: string;       // 日、一、二...
    type: EventType;
    volunteers: string[];    // displayName 列表
    rawText: string;         // 原始文字，如 "1/04(日)共修: user1"
}

/** 完整活動排程 */
export interface Schedule {
    id?: string;
    groupId: string;
    title: string;           // "115年1-4月音響活動發心"
    year: number;            // 民國年
    events: ScheduleEvent[];
    rawMessage: string;      // 原始完整訊息
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;       // LINE userId
}

// ============ 使用者綁定 ============

/** 使用者綁定資料 */
export interface UserBinding {
    displayName: string;     // 活動排程中的名稱，如 "user1"
    userId: string;          // LINE userId
    userName: string;        // LINE 顯示名稱（備註用）
    boundAt: Date;
    boundBy: string;         // 誰綁定的（userId）
}

// ============ 群組資訊 ============

/** 群組資訊 */
export interface GroupInfo {
    groupId: string;
    groupName?: string;
    botJoinedAt: Date;
    lastActiveAt: Date;
}

// ============ 指令相關 ============

/** 支援的指令類型 */
export type CommandType = '綁定' | '解綁' | '查詢' | '列表' | '幫助' | '測試提醒' | '正式日期測試' | '用量';

/** 解析後的指令 */
export interface ParsedCommand {
    type: CommandType;
    args: string[];
    rawText: string;
}

// ============ LINE Webhook 擴展 ============

/** 群組訊息來源 */
export interface GroupSource {
    type: 'group';
    groupId: string;
    userId: string;
}

/** 處理結果 */
export interface HandleResult {
    success: boolean;
    message?: string;
    data?: unknown;
}
