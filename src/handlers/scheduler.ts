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

    // 發送群組訊息
    await pushMessage(groupId, createTextMessage(reminderText));
    console.log(`Reminder sent to group ${groupId}`);

    // 發送私訊給每個有綁定的志工
    await sendPrivateRemindersToVolunteers(events, bindings);
}

/**
 * 發送私訊給每個有排班的志工
 */
async function sendPrivateRemindersToVolunteers(
    events: Array<{ date: Date; type: string; volunteers: string[] }>,
    bindings: Map<string, { displayName: string; userId: string; userName: string }>
): Promise<void> {
    // 建立每個志工的排班列表
    const volunteerSchedules = new Map<string, Array<{ date: Date; type: string }>>();

    for (const event of events) {
        for (const volunteer of event.volunteers) {
            const binding = bindings.get(volunteer);
            if (binding) {
                const userId = binding.userId;
                if (!volunteerSchedules.has(userId)) {
                    volunteerSchedules.set(userId, []);
                }
                volunteerSchedules.get(userId)!.push({
                    date: event.date,
                    type: event.type,
                });
            }
        }
    }

    // 發送私訊給每個志工
    for (const [userId, schedules] of volunteerSchedules) {
        try {
            const message = formatPrivateReminderMessage(schedules);
            await pushMessage(userId, createTextMessage(message));
            console.log(`Private reminder sent to user ${userId}`);
        } catch (error) {
            // 使用者可能沒有加機器人為好友，忽略錯誤
            console.log(`Failed to send private message to ${userId}: ${error}`);
        }
    }
}

/**
 * 格式化私訊提醒訊息
 */
function formatPrivateReminderMessage(
    schedules: Array<{ date: Date; type: string }>
): string {
    const lines = ['📢 提醒您下週有排班：', ''];

    for (const schedule of schedules) {
        const dateStr = formatDateForPrivateMessage(schedule.date);
        lines.push(`🔸 ${dateStr} ${schedule.type}`);
    }

    lines.push('');
    lines.push('請記得出席！🙏');

    return lines.join('\n');
}

/**
 * 格式化日期用於私訊
 */
function formatDateForPrivateMessage(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const dayOfWeek = dayNames[date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
}

/**
 * 處理測試提醒（用於 !測試提醒 指令）
 * 測試模式：顯示排程中所有未過期的活動，並發送私訊給志工
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

        // 取得今天的日期（去除時間）
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 取得所有未過期的活動
        const events = schedule.events.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
        });

        if (events.length === 0) {
            await replyMessage(replyToken, createTextMessage(
                '📅 沒有即將到來的活動\n' +
                '所有活動都已過期，請更新排程'
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
        const testMessage = `🧪 【測試提醒】\n\n${reminderText}\n\n---\n共 ${events.length} 場活動`;

        await replyMessage(replyToken, createTextMessage(testMessage));

        // 測試時也發送私訊給有綁定的志工
        if (bindings.size > 0) {
            const eventsForPrivate = events.map(e => ({
                date: e.date,
                type: e.type,
                volunteers: e.volunteers,
            }));
            await sendPrivateRemindersToVolunteers(eventsForPrivate, bindings);
        }
    } catch (error) {
        console.error('Error in test reminder:', error);
        await replyMessage(replyToken, createTextMessage(
            '❌ 測試提醒失敗\n錯誤：' + String(error)
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

/**
 * 處理正式日期測試指令
 * 顯示今天到下週六的日期範圍及活動
 */
export async function handleProductionDateTest(
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

        // 取得正式提醒的日期範圍（今天到下週六）
        const { start, end } = getNextWeekRange();

        // 取得該時間範圍的活動
        const events = schedule.events.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            const startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999);
            return eventDate >= startDate && eventDate <= endDate;
        });

        // 格式化日期顯示
        const rangeStr = formatDateRange(start, end);
        const today = new Date();
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        const todayStr = `${today.getMonth() + 1}/${today.getDate()}(${dayNames[today.getDay()]})`;

        if (events.length === 0) {
            await replyMessage(replyToken, createTextMessage(
                `📅 【正式日期測試】\n\n` +
                `📍 今天：${todayStr}\n` +
                `📍 查詢範圍：${rangeStr}\n\n` +
                `⚠️ 這個範圍內沒有活動`
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

        // 組合測試結果
        const testMessage =
            `📅 【正式日期測試】\n\n` +
            `📍 今天：${todayStr}\n` +
            `📍 查詢範圍：${rangeStr}\n` +
            `📍 活動數量：${events.length} 場\n\n` +
            `${reminderText}`;

        await replyMessage(replyToken, createTextMessage(testMessage));

        // 發送私訊給有綁定的志工（與正式運作一樣）
        if (bindings.size > 0) {
            const eventsForPrivate = events.map(e => ({
                date: e.date,
                type: e.type,
                volunteers: e.volunteers,
            }));
            await sendPrivateRemindersToVolunteers(eventsForPrivate, bindings);
        }
    } catch (error) {
        console.error('Error in production date test:', error);
        await replyMessage(replyToken, createTextMessage(
            '❌ 正式日期測試失敗\n錯誤：' + String(error)
        ));
    }
}
