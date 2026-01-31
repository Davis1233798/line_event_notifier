import {
    pushMessage,
    replyMessage,
    createTextMessage,
    formatReminderMessage,
} from '../services/line.js';
import {
    getUpcomingEvents,
    getBindingsForNames,
    getAllGroups,
    getLatestSchedule,
} from '../services/firestore.js';
import { getNextWeekRange } from '../services/parser.js';

/**
 * 處理排程觸發（由 Cloud Scheduler 呼叫）
 * 發送下週活動提醒到所有群組
 */
export async function handleSchedulerTrigger(): Promise<{
    success: boolean;
    groupsProcessed: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let groupsProcessed = 0;

    try {
        // 取得所有群組
        const groups = await getAllGroups();
        console.log(`Found ${groups.length} groups to process`);

        // 取得下週日期範圍
        const { start, end } = getNextWeekRange();
        console.log(`Looking for events from ${start.toISOString()} to ${end.toISOString()}`);

        // 對每個群組發送提醒
        for (const group of groups) {
            try {
                await sendReminderToGroup(group.groupId, start, end);
                groupsProcessed++;
            } catch (error) {
                const errorMessage = `Error processing group ${group.groupId}: ${error}`;
                console.error(errorMessage);
                errors.push(errorMessage);
            }
        }

        return {
            success: errors.length === 0,
            groupsProcessed,
            errors,
        };
    } catch (error) {
        const errorMessage = `Scheduler trigger failed: ${error}`;
        console.error(errorMessage);
        return {
            success: false,
            groupsProcessed,
            errors: [errorMessage],
        };
    }
}

/**
 * 發送提醒到指定群組
 */
async function sendReminderToGroup(
    groupId: string,
    startDate: Date,
    endDate: Date
): Promise<void> {
    // 取得該時間範圍的活動
    const events = await getUpcomingEvents(groupId, startDate, endDate);

    if (events.length === 0) {
        console.log(`No events found for group ${groupId}`);
        return;
    }

    // 收集所有志工名稱
    const allVolunteers = new Set<string>();
    for (const event of events) {
        event.volunteers.forEach(v => allVolunteers.add(v));
    }

    // 取得綁定資訊
    const bindings = await getBindingsForNames(groupId, Array.from(allVolunteers));

    // 建立 displayName -> LINE 名稱 的對照
    const volunteerNames = new Map<string, string>();
    for (const [displayName, binding] of bindings) {
        volunteerNames.set(displayName, binding.userName);
    }

    // 格式化提醒訊息
    const eventsWithNames = events.map(event => ({
        date: event.date,
        type: event.type,
        volunteers: event.volunteers,
        volunteerNames,
    }));

    const reminderText = formatReminderMessage(eventsWithNames);

    // 發送訊息
    await pushMessage(groupId, createTextMessage(reminderText));
    console.log(`Reminder sent to group ${groupId}`);
}

/**
 * 處理測試提醒（用於 !測試提醒 指令）
 */
export async function handleTestReminder(
    replyToken: string,
    groupId: string
): Promise<void> {
    try {
        // 取得最新排程
        const schedule = await getLatestSchedule(groupId);

        if (!schedule) {
            await replyMessage(replyToken, createTextMessage(
                '❌ 尚未設定活動排程\n' +
                '請先 @ 我並貼上活動訊息'
            ));
            return;
        }

        // 取得下週日期範圍
        const { start, end } = getNextWeekRange();

        // 取得該時間範圍的活動
        const events = schedule.events.filter(event => {
            const eventTime = event.date.getTime();
            return eventTime >= start.getTime() && eventTime <= end.getTime();
        });

        if (events.length === 0) {
            await replyMessage(replyToken, createTextMessage(
                '📅 下週沒有安排活動\n\n' +
                `查詢範圍：${formatDateRange(start, end)}`
            ));
            return;
        }

        // 收集所有志工名稱
        const allVolunteers = new Set<string>();
        for (const event of events) {
            event.volunteers.forEach(v => allVolunteers.add(v));
        }

        // 取得綁定資訊
        const bindings = await getBindingsForNames(groupId, Array.from(allVolunteers));

        // 建立 displayName -> LINE 名稱 的對照
        const volunteerNames = new Map<string, string>();
        for (const [displayName, binding] of bindings) {
            volunteerNames.set(displayName, binding.userName);
        }

        // 格式化提醒訊息
        const eventsWithNames = events.map(event => ({
            date: event.date,
            type: event.type,
            volunteers: event.volunteers,
            volunteerNames,
        }));

        const reminderText = formatReminderMessage(eventsWithNames);

        // 加上測試標記
        const testMessage = `🧪 【測試提醒】\n\n${reminderText}\n\n---\n查詢範圍：${formatDateRange(start, end)}`;

        await replyMessage(replyToken, createTextMessage(testMessage));
    } catch (error) {
        console.error('Error in test reminder:', error);
        await replyMessage(replyToken, createTextMessage(
            '❌ 測試提醒失敗，請稍後再試'
        ));
    }
}

/**
 * 格式化日期範圍
 */
function formatDateRange(start: Date, end: Date): string {
    const formatDate = (d: Date) => {
        const month = d.getMonth() + 1;
        const day = d.getDate();
        return `${month}/${day}`;
    };
    return `${formatDate(start)} ~ ${formatDate(end)}`;
}
