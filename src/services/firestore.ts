import { Firestore, Timestamp, FieldValue } from '@google-cloud/firestore';
import { config } from '../config.js';
import type { Schedule, ScheduleEvent, UserBinding, GroupInfo } from '../types/index.js';

// Firestore 實例
let firestoreClient: Firestore | null = null;

/**
 * 取得 Firestore 實例（單例模式）
 */
export function getFirestore(): Firestore {
    if (!firestoreClient) {
        firestoreClient = new Firestore({
            projectId: config.gcpProjectId || undefined,
        });
    }
    return firestoreClient;
}

// ============ 活動排程相關 ============

/**
 * 儲存活動排程
 */
export async function saveSchedule(schedule: Schedule): Promise<string> {
    const db = getFirestore();
    const docRef = db.collection('schedules').doc();

    const data = {
        ...schedule,
        events: schedule.events.map(e => ({
            ...e,
            date: Timestamp.fromDate(e.date),
        })),
        createdAt: Timestamp.fromDate(schedule.createdAt),
        updatedAt: Timestamp.fromDate(schedule.updatedAt),
    };

    await docRef.set(data);
    return docRef.id;
}

/**
 * 取得群組的最新活動排程
 */
export async function getLatestSchedule(groupId: string): Promise<Schedule | null> {
    const db = getFirestore();
    const snapshot = await db
        .collection('schedules')
        .where('groupId', '==', groupId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return convertScheduleFromFirestore(doc.id, doc.data());
}

/**
 * 取得指定日期範圍內的活動
 */
export async function getUpcomingEvents(
    groupId: string,
    startDate: Date,
    endDate: Date
): Promise<ScheduleEvent[]> {
    const schedule = await getLatestSchedule(groupId);
    if (!schedule) {
        return [];
    }

    return schedule.events.filter(event => {
        const eventTime = event.date.getTime();
        return eventTime >= startDate.getTime() && eventTime <= endDate.getTime();
    });
}

/**
 * 從 Firestore 資料轉換為 Schedule 物件
 */
function convertScheduleFromFirestore(id: string, data: FirebaseFirestore.DocumentData): Schedule {
    return {
        id,
        groupId: data.groupId,
        title: data.title,
        year: data.year,
        events: data.events.map((e: any) => ({
            date: e.date.toDate(),
            dayOfWeek: e.dayOfWeek,
            type: e.type,
            volunteers: e.volunteers,
            rawText: e.rawText,
        })),
        rawMessage: data.rawMessage,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        createdBy: data.createdBy,
    };
}

// ============ 使用者綁定相關 ============

/**
 * 綁定使用者
 */
export async function bindUser(
    groupId: string,
    displayName: string,
    userId: string,
    userName: string,
    boundBy: string
): Promise<void> {
    const db = getFirestore();
    const docRef = db
        .collection('groups')
        .doc(groupId)
        .collection('userBindings')
        .doc(displayName);

    await docRef.set({
        displayName,
        userId,
        userName,
        boundAt: Timestamp.now(),
        boundBy,
    });
}

/**
 * 解除綁定
 */
export async function unbindUser(groupId: string, displayName: string): Promise<boolean> {
    const db = getFirestore();
    const docRef = db
        .collection('groups')
        .doc(groupId)
        .collection('userBindings')
        .doc(displayName);

    const doc = await docRef.get();
    if (!doc.exists) {
        return false;
    }

    await docRef.delete();
    return true;
}

/**
 * 取得使用者綁定資料
 */
export async function getUserBinding(
    groupId: string,
    displayName: string
): Promise<UserBinding | null> {
    const db = getFirestore();
    const doc = await db
        .collection('groups')
        .doc(groupId)
        .collection('userBindings')
        .doc(displayName)
        .get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;
    return {
        displayName: data.displayName,
        userId: data.userId,
        userName: data.userName,
        boundAt: data.boundAt.toDate(),
        boundBy: data.boundBy,
    };
}

/**
 * 透過 userId 查詢綁定
 */
export async function getBindingByUserId(
    groupId: string,
    userId: string
): Promise<UserBinding | null> {
    const db = getFirestore();
    const snapshot = await db
        .collection('groups')
        .doc(groupId)
        .collection('userBindings')
        .where('userId', '==', userId)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const data = snapshot.docs[0].data();
    return {
        displayName: data.displayName,
        userId: data.userId,
        userName: data.userName,
        boundAt: data.boundAt.toDate(),
        boundBy: data.boundBy,
    };
}

/**
 * 取得群組所有綁定
 */
export async function getAllBindings(groupId: string): Promise<UserBinding[]> {
    const db = getFirestore();
    const snapshot = await db
        .collection('groups')
        .doc(groupId)
        .collection('userBindings')
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            displayName: data.displayName,
            userId: data.userId,
            userName: data.userName,
            boundAt: data.boundAt.toDate(),
            boundBy: data.boundBy,
        };
    });
}

/**
 * 批次取得多個 displayName 的綁定
 */
export async function getBindingsForNames(
    groupId: string,
    displayNames: string[]
): Promise<Map<string, UserBinding>> {
    const db = getFirestore();
    const result = new Map<string, UserBinding>();

    // Firestore 的 in 查詢最多支援 30 個值
    const chunks = chunkArray(displayNames, 30);

    for (const chunk of chunks) {
        const snapshot = await db
            .collection('groups')
            .doc(groupId)
            .collection('userBindings')
            .where('displayName', 'in', chunk)
            .get();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            result.set(data.displayName, {
                displayName: data.displayName,
                userId: data.userId,
                userName: data.userName,
                boundAt: data.boundAt.toDate(),
                boundBy: data.boundBy,
            });
        }
    }

    return result;
}

// ============ 群組資訊相關 ============

/**
 * 儲存或更新群組資訊
 */
export async function saveGroupInfo(groupId: string, groupName?: string): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection('groups').doc(groupId);

    const updateData: Record<string, any> = {
        groupId,
        lastActiveAt: Timestamp.now(),
    };

    if (groupName) {
        updateData.groupName = groupName;
    }

    await docRef.set(updateData, { merge: true });
}

/**
 * 設定群組機器人加入時間
 */
export async function setBotJoinedAt(groupId: string): Promise<void> {
    const db = getFirestore();
    await db.collection('groups').doc(groupId).set(
        {
            groupId,
            botJoinedAt: Timestamp.now(),
            lastActiveAt: Timestamp.now(),
        },
        { merge: true }
    );
}

/**
 * 取得所有活躍群組
 */
export async function getAllGroups(): Promise<GroupInfo[]> {
    const db = getFirestore();
    const snapshot = await db.collection('groups').get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            groupId: data.groupId,
            groupName: data.groupName,
            botJoinedAt: data.botJoinedAt?.toDate() || new Date(),
            lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        };
    });
}

// ============ 工具函數 ============

/**
 * 將陣列分割成指定大小的多個陣列
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
