import { WebhookEvent, TextEventMessage } from '@line/bot-sdk';
import {
    replyMessage,
    pushMessage,
    createTextMessage,
    isBotMentioned,
    getGroupId,
    getUserId,
    getGroupMemberProfile,
    getQuotaInfo,
} from '../services/line.js';
import {
    parseScheduleMessage,
    parseCommand,
    isScheduleMessage,
} from '../services/parser.js';
import {
    saveSchedule,
    bindUser,
    unbindUser,
    getBindingByUserId,
    getAllBindings,
    saveGroupInfo,
    setBotJoinedAt,
} from '../services/firestore.js';
import { handleTestReminder, handleProductionDateTest } from './scheduler.js';
import type { ParsedCommand } from '../types/index.js';

/**
 * 處理 LINE Webhook 事件
 */
export async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
    // 處理加入群組事件
    if (event.type === 'join') {
        await handleBotJoin(event);
        return;
    }

    // 只處理文字訊息
    if (event.type !== 'message' || event.message.type !== 'text') {
        return;
    }

    const message = event.message.text;
    const command = parseCommand(message);

    // 私訊處理：支援部分指令
    if (event.source.type === 'user') {
        if (command) {
            // 私訊支援的指令：幫助、用量
            if (command.type === '幫助') {
                await showHelp(event.replyToken);
                return;
            }
            if (command.type === '用量') {
                await handleQuotaCommand(event.replyToken);
                return;
            }
        }
        // 其他私訊回覆說明
        await replyMessage(event.replyToken, createTextMessage(
            '👋 您好！我是活動提醒機器人\n\n' +
            '📌 私訊可用指令：\n' +
            '• !幫助 - 查看說明\n' +
            '• !用量 - 查看本月訊息用量\n\n' +
            '💡 其他功能請在群組中使用'
        ));
        return;
    }

    // 非群組也非私訊（如房間），忽略
    if (event.source.type !== 'group') {
        return;
    }

    const groupId = event.source.groupId;
    const userId = event.source.userId;

    // 更新群組活動時間（非關鍵，錯誤不阻斷流程）
    try {
        await saveGroupInfo(groupId);
    } catch (error) {
        console.error('Error saving group info:', error);
    }

    // 檢查是否為指令（使用已宣告的 command）
    if (command) {
        console.log(`Command detected: ${command.type} ${command.args.join(' ')}`);
        await handleCommand(event.replyToken, groupId, userId!, command);
        return;
    } else {
        console.log(`Message received but not a command: "${message}"`);
    }

    // 檢查是否被 mention 且包含活動排程
    if (isBotMentioned(event)) {
        console.log(`Bot mentioned in message: "${message}"`);
        if (isScheduleMessage(message)) {
            console.log('Schedule message detected');
            await handleScheduleMessage(event.replyToken, groupId, userId!, message);
            return;
        } else {
            console.log('Not a schedule message, showing help');
            await showHelp(event.replyToken);
            return;
        }
    }

}

/**
 * 處理用量查詢指令
 */
async function handleQuotaCommand(replyToken: string): Promise<void> {
    try {
        const { quota, used, remaining } = await getQuotaInfo();

        await replyMessage(replyToken, createTextMessage(
            `📊 本月訊息用量\n\n` +
            `🔹 總額度：${quota} 則\n` +
            `🔸 已使用：${used} 則\n` +
            `✅ 剩餘：${remaining} 則`
        ));
    } catch (error) {
        console.error('Error getting quota info:', error);
        await replyMessage(replyToken, createTextMessage(
            '❌ 查詢用量失敗，請稍後再試'
        ));
    }
}

/**
 * 處理機器人加入群組
 */
async function handleBotJoin(event: WebhookEvent): Promise<void> {
    if (event.type !== 'join') return;

    const groupId = getGroupId(event);
    if (!groupId) return;

    await setBotJoinedAt(groupId);

    if ('replyToken' in event) {
        await replyMessage(event.replyToken, createTextMessage(
            '👋 大家好！我是活動提醒機器人\n\n' +
            '📌 功能說明：\n' +
            '1. @ 我並貼上活動排程，我會記住\n' +
            '2. 每週六我會提醒下週的活動\n\n' +
            '💡 輸入 !幫助 查看更多指令'
        ));
    }
}

/**
 * 處理活動排程訊息
 */
async function handleScheduleMessage(
    replyToken: string,
    groupId: string,
    userId: string,
    message: string
): Promise<void> {
    try {
        const schedule = parseScheduleMessage(message, groupId, userId);

        if (!schedule) {
            await replyMessage(replyToken, createTextMessage(
                '❌ 無法解析活動排程\n' +
                '請確認格式正確，例如：\n' +
                '1/04(日)共修: user1\n' +
                '1/11(日)法會: user1、user2'
            ));
            return;
        }

        // 儲存排程
        const scheduleId = await saveSchedule(schedule);

        // 統計資訊
        const eventCount = schedule.events.length;
        const volunteersSet = new Set(schedule.events.flatMap(e => e.volunteers));
        const volunteerCount = volunteersSet.size;

        await replyMessage(replyToken, createTextMessage(
            `✅ 已儲存活動排程！\n\n` +
            `📋 ${schedule.title}\n` +
            `📅 共 ${eventCount} 場活動\n` +
            `👥 共 ${volunteerCount} 位志工\n\n` +
            `💡 提醒：請志工使用 !綁定 <名稱> 完成綁定\n` +
            `例如：!綁定 user1`
        ));
    } catch (error) {
        console.error('Error handling schedule message:', error);
        await replyMessage(replyToken, createTextMessage(
            '❌ 儲存活動排程時發生錯誤，請稍後再試'
        ));
    }
}

/**
 * 處理使用者指令
 */
async function handleCommand(
    replyToken: string,
    groupId: string,
    userId: string,
    command: ParsedCommand
): Promise<void> {
    switch (command.type) {
        case '綁定':
            await handleBindCommand(replyToken, groupId, userId, command.args);
            break;
        case '解綁':
            await handleUnbindCommand(replyToken, groupId, userId, command.args);
            break;
        case '查詢':
            await handleQueryCommand(replyToken, groupId, userId);
            break;
        case '列表':
            await handleListCommand(replyToken, groupId);
            break;
        case '幫助':
            await showHelp(replyToken);
            break;
        case '測試提醒':
            await handleTestReminder(replyToken, groupId);
            break;
        case '正式日期測試':
            await handleProductionDateTest(replyToken, groupId);
            break;
        case '用量':
            await handleQuotaCommand(replyToken);
            break;
    }
}

/**
 * 處理綁定指令
 */
async function handleBindCommand(
    replyToken: string,
    groupId: string,
    userId: string,
    args: string[]
): Promise<void> {
    if (args.length === 0) {
        await replyMessage(replyToken, createTextMessage(
            '❌ 請指定要綁定的名稱\n' +
            '格式：!綁定 <名稱>\n' +
            '例如：!綁定 user1'
        ));
        return;
    }

    const displayName = args[0];

    try {
        // 取得使用者的 LINE 名稱
        const profile = await getGroupMemberProfile(groupId, userId);
        const userName = profile.displayName;

        // 儲存綁定
        await bindUser(groupId, displayName, userId, userName, userId);

        // 發送測試私訊驗證功能
        let privateMessageStatus = '';
        try {
            await pushMessage(userId, createTextMessage(
                `🎉 綁定測試成功！\n\n` +
                `您已成功綁定為「${displayName}」\n` +
                `之後有活動提醒時，我會私訊通知您。`
            ));
            privateMessageStatus = '\n\n✅ 已發送測試私訊給您';
            console.log(`Test private message sent to ${userId}`);
        } catch (pmError) {
            privateMessageStatus = '\n\n⚠️ 無法發送私訊，請確認已加我為好友';
            console.log(`Failed to send test private message to ${userId}:`, pmError);
        }

        await replyMessage(replyToken, createTextMessage(
            `✅ ${userName} 已綁定為「${displayName}」${privateMessageStatus}`
        ));
    } catch (error) {
        console.error('Error binding user:', error);
        await replyMessage(replyToken, createTextMessage(
            '❌ 綁定失敗，請稍後再試'
        ));
    }
}

/**
 * 處理解綁指令
 */
async function handleUnbindCommand(
    replyToken: string,
    groupId: string,
    userId: string,
    args: string[]
): Promise<void> {
    if (args.length === 0) {
        // 解除自己的綁定
        const binding = await getBindingByUserId(groupId, userId);
        if (!binding) {
            await replyMessage(replyToken, createTextMessage(
                '❌ 您尚未綁定任何名稱'
            ));
            return;
        }

        await unbindUser(groupId, binding.displayName);
        await replyMessage(replyToken, createTextMessage(
            `✅ 已解除「${binding.displayName}」的綁定`
        ));
    } else {
        // 解除指定名稱的綁定
        const displayName = args[0];
        const success = await unbindUser(groupId, displayName);

        if (success) {
            await replyMessage(replyToken, createTextMessage(
                `✅ 已解除「${displayName}」的綁定`
            ));
        } else {
            await replyMessage(replyToken, createTextMessage(
                `❌ 找不到「${displayName}」的綁定`
            ));
        }
    }
}

/**
 * 處理查詢指令
 */
async function handleQueryCommand(
    replyToken: string,
    groupId: string,
    userId: string
): Promise<void> {
    const binding = await getBindingByUserId(groupId, userId);

    if (!binding) {
        await replyMessage(replyToken, createTextMessage(
            '❌ 您尚未綁定任何名稱\n' +
            '使用 !綁定 <名稱> 來綁定'
        ));
        return;
    }

    await replyMessage(replyToken, createTextMessage(
        `📋 您的綁定資訊：\n\n` +
        `📝 名稱：${binding.displayName}\n` +
        `👤 LINE 帳號：${binding.userName}\n` +
        `📅 綁定時間：${formatDate(binding.boundAt)}`
    ));
}

/**
 * 處理列表指令
 */
async function handleListCommand(
    replyToken: string,
    groupId: string
): Promise<void> {
    const bindings = await getAllBindings(groupId);

    if (bindings.length === 0) {
        await replyMessage(replyToken, createTextMessage(
            '📋 目前沒有任何綁定\n' +
            '使用 !綁定 <名稱> 來新增綁定'
        ));
        return;
    }

    const lines = ['📋 綁定列表：', ''];
    for (const binding of bindings) {
        lines.push(`• ${binding.displayName} → ${binding.userName}`);
    }

    await replyMessage(replyToken, createTextMessage(lines.join('\n')));
}

/**
 * 顯示幫助訊息
 */
async function showHelp(replyToken: string): Promise<void> {
    await replyMessage(replyToken, createTextMessage(
        '📚 活動提醒機器人使用說明\n\n' +
        '【新增活動排程】\n' +
        '@ 我並貼上活動訊息即可\n\n' +
        '【指令列表】\n' +
        '!綁定 <名稱> - 將自己綁定為該名稱\n' +
        '!解綁 - 解除自己的綁定\n' +
        '!查詢 - 查詢自己的綁定\n' +
        '!列表 - 列出所有綁定\n' +
        '!測試提醒 - 測試發送提醒（顯示所有活動）\n' +
        '!正式日期測試 - 測試正式日期範圍\n' +
        '!用量 - 查詢本月訊息用量\n' +
        '!幫助 - 顯示此說明\n\n' +
        '💡 私訊可使用：!幫助、!用量\n' +
        '🔔 每週六早上 8:00 自動發送提醒'
    ));
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}
