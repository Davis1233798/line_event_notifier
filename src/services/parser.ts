import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import 'dayjs/locale/zh-tw.js';
import type { ScheduleEvent, Schedule, ParsedCommand, CommandType } from '../types/index.js';

dayjs.extend(customParseFormat);
dayjs.locale('zh-tw');

/**
 * 解析活動排程訊息
 * 
 * 範例輸入：
 * ```
 * 115年1-4月音響活動發心，邀請大家一起發心護持
 * 🚩共修早上10:00~12:00
 * 🚩法會早上09:00~12:00(基本2位)
 * 🚩悠遊普思 整天(基本3位)
 * --------------------------
 * 1/04(日)共修: user1
 * 1/11(日)共修: user2
 * 1/18(日)法會: user1、user2
 * ```
 */
export function parseScheduleMessage(
    message: string,
    groupId: string,
    createdBy: string
): Schedule | null {
    const lines = message.split('\n').map(line => line.trim()).filter(Boolean);

    if (lines.length < 3) {
        return null;
    }

    // 嘗試解析標題和年份
    const titleLine = lines[0];
    const yearMatch = titleLine.match(/(\d+)年/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : getCurrentMinguoYear();

    // 找到分隔線位置
    const separatorIndex = lines.findIndex(line => /^-{3,}$/.test(line));

    // 如果沒有分隔線，嘗試從第一個日期行開始解析
    let eventLines: string[];
    if (separatorIndex >= 0) {
        eventLines = lines.slice(separatorIndex + 1);
    } else {
        // 找第一個看起來像日期的行
        const firstEventIndex = lines.findIndex(line => /^\d{1,2}\/\d{1,2}/.test(line));
        if (firstEventIndex < 0) {
            return null;
        }
        eventLines = lines.slice(firstEventIndex);
    }

    // 解析每個活動
    const events: ScheduleEvent[] = [];

    for (const line of eventLines) {
        const event = parseEventLine(line, year);
        if (event) {
            events.push(event);
        }
    }

    if (events.length === 0) {
        return null;
    }

    return {
        groupId,
        title: titleLine,
        year,
        events,
        rawMessage: message,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
    };
}

/**
 * 解析單行活動
 * 範例：1/04(日)共修: user1
 *       2/17(二)新春法會:
 */
function parseEventLine(line: string, minguoYear: number): ScheduleEvent | null {
    // 匹配模式：月/日(星期)活動類型: 志工列表
    const pattern = /^(\d{1,2})\/(\d{1,2})\(([日一二三四五六])\)(.+?)[:：]\s*(.*)$/;
    const match = line.match(pattern);

    if (!match) {
        return null;
    }

    const [, monthStr, dayStr, dayOfWeek, type, volunteersStr] = match;
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // 民國年轉西元年
    const westernYear = minguoYear + 1911;

    // 建立日期
    const date = new Date(westernYear, month - 1, day);

    // 解析志工列表（可能用頓號、逗號或空格分隔）
    const volunteers = volunteersStr
        .split(/[、,，\s]+/)
        .map(v => v.trim())
        .filter(Boolean);

    return {
        date,
        dayOfWeek,
        type: type.trim(),
        volunteers,
        rawText: line,
    };
}

/**
 * 取得目前民國年
 */
function getCurrentMinguoYear(): number {
    return new Date().getFullYear() - 1911;
}

/**
 * 解析使用者指令
 * 支援的指令：
 * - !綁定 <名稱> - 綁定自己為指定名稱
 * - !解綁 <名稱> - 解除綁定
 * - !查詢 - 查詢自己的綁定
 * - !列表 - 列出所有綁定
 * - !幫助 - 顯示說明
 * - !測試提醒 - 測試提醒功能
 */
export function parseCommand(message: string): ParsedCommand | null {
    const trimmed = message.trim();

    // 必須以 ! 或 ！開頭
    if (!trimmed.startsWith('!') && !trimmed.startsWith('！')) {
        return null;
    }

    const content = trimmed.slice(1).trim();
    const parts = content.split(/\s+/);

    if (parts.length === 0) {
        return null;
    }

    const commandMap: Record<string, CommandType> = {
        '綁定': '綁定',
        'bind': '綁定',
        '解綁': '解綁',
        'unbind': '解綁',
        '查詢': '查詢',
        'query': '查詢',
        '列表': '列表',
        'list': '列表',
        '幫助': '幫助',
        'help': '幫助',
        '測試提醒': '測試提醒',
        'test': '測試提醒',
    };

    let commandType = commandMap[parts[0]];
    let args = parts.slice(1);

    // 如果直接匹配失敗，嘗試檢查是否為「指令+參數」黏在一起的情況 (e.g. "綁定user1")
    if (!commandType) {
        const potentialCommand = parts[0];
        // 依照長度排序，優先匹配較長的指令（雖目前無重疊指令，但屬好習慣）
        const knownCommands = Object.keys(commandMap).sort((a, b) => b.length - a.length);

        for (const cmd of knownCommands) {
            if (potentialCommand.startsWith(cmd)) {
                commandType = commandMap[cmd];
                // 剩下的部分作為第一個參數
                const firstArg = potentialCommand.slice(cmd.length);
                if (firstArg) {
                    args = [firstArg, ...args];
                }
                break;
            }
        }
    }

    if (!commandType) {
        return null;
    }

    return {
        type: commandType,
        args: args,
        rawText: message,
    };
}

/**
 * 檢查訊息是否為活動排程（簡易判斷）
 */
export function isScheduleMessage(message: string): boolean {
    // 檢查是否包含日期格式和活動類型
    const hasDatePattern = /\d{1,2}\/\d{1,2}\([日一二三四五六]\)/.test(message);
    const hasEventType = /(共修|法會|悠遊普思)/.test(message);

    return hasDatePattern && hasEventType;
}

/**
 * 格式化日期為顯示格式
 */
export function formatDate(date: Date): string {
    return dayjs(date).format('M/DD(dd)');
}

/**
 * 取得指定日期範圍內的活動
 */
export function filterEventsByDateRange(
    events: ScheduleEvent[],
    startDate: Date,
    endDate: Date
): ScheduleEvent[] {
    return events.filter(event => {
        const eventTime = event.date.getTime();
        return eventTime >= startDate.getTime() && eventTime <= endDate.getTime();
    });
}

/**
 * 取得下週的日期範圍（週日到週六）
 */
export function getNextWeekRange(): { start: Date; end: Date } {
    const now = dayjs();
    // 下週日
    const nextSunday = now.add(1, 'week').startOf('week');
    // 下週六
    const nextSaturday = nextSunday.add(6, 'day').endOf('day');

    return {
        start: nextSunday.toDate(),
        end: nextSaturday.toDate(),
    };
}
