# 🤖 LINE 活動提醒機器人 - Render + Supabase 版本

這本手冊教你用 **Render (免費)** + **Supabase (免費)** 來部署機器人，完全不需要信用卡！

> ⚠️ **注意**：此專案目前使用 Firestore 資料庫。如要改用 Supabase，需要修改程式碼。
> 本手冊假設你已經將資料庫改成 Supabase，或者之後會有 Supabase 版本的程式碼。

---

## 📖 目錄

1. [這是什麼？](#1-這是什麼)
2. [第一關：Fork 專案](#2-第一關fork-專案)
3. [第二關：申請 LINE Bot](#3-第二關申請-line-bot)
4. [第三關：設定 Supabase (資料庫)](#4-第三關設定-supabase-資料庫)
5. [第四關：部署到 Render](#5-第四關部署到-render)
6. [第五關：設定定時提醒](#6-第五關設定定時提醒)
7. [第六關：測試與使用](#7-第六關測試與使用)

---

## 1. 這是什麼？

這是一個住在 LINE 群組裡的機器人。
*   **它的工作**：幫忙記住大家發布的活動，每週六早上提醒大家。
*   **它的特技**：可以記住你的名字，提醒時直接叫你！

**這個版本的優點**：
- ✅ Render 免費方案：每月 750 小時
- ✅ Supabase 免費方案：500 MB 資料庫
- ✅ 不需要信用卡

---

## 2. 第一關：Fork 專案

1.  登入 [GitHub](https://github.com/)。
2.  點這個連結：👉 [https://github.com/Davis1233798/line_event_notifier](https://github.com/Davis1233798/line_event_notifier)
3.  點右上角 **"Fork"** → **"Create fork"**。
4.  完成！

---

## 3. 第二關：申請 LINE Bot

1.  **登入 LINE Developers**：
    *   去 [LINE Developers Console](https://developers.line.biz/console/)。
    *   用 LINE 帳號登入。

2.  **建立 Provider**：
    *   點 "Create a new provider"，名字隨便取。

3.  **建立 Channel**：
    *   選 **"Messaging API"**。
    *   填寫 Channel name (例如 "活動小幫手")。
    *   勾選同意，點 "Create"。

4.  **拿鑰匙**：
    *   **Basic settings**：複製 **Channel Secret** 🗝️
    *   **Messaging API**：按 Issue 產生並複製 **Channel access token** 🗝️

5.  **關閉自動回覆**：
    *   Messaging API 頁籤 → "Auto-reply messages" → Edit。
    *   把 Auto-response 和 Greeting message 都關掉。

---

## 4. 第三關：設定 Supabase (資料庫)

Supabase 是免費的資料庫服務，機器人用它來記住活動資料。

### 4-1. 建立帳號與專案

1.  去 [Supabase](https://supabase.com/)，點 **"Start your project"**。
2.  用 GitHub 帳號登入 (最方便)。
3.  點 **"New project"**。
4.  設定：
    *   Name：`line-notifier`
    *   Database Password：設一個密碼，**記下來！**
    *   Region：選 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`
5.  點 "Create new project"，等待建立 (約 2 分鐘)。

### 4-2. 取得連線資訊

1.  在專案頁面，點左邊選單的 **"Project Settings"** (齒輪圖示)。
2.  點 **"Database"**。
3.  在 "Connection string" 區塊，複製 **URI** (記得把 `[YOUR-PASSWORD]` 換成你剛設的密碼)。

或者使用：
- **Host**：在 Database 頁面可以看到
- **Database**：`postgres`
- **User**：`postgres`
- **Password**：你剛設的密碼
- **Port**：`5432`

### 4-3. 建立資料表

1.  點左邊選單的 **"SQL Editor"**。
2.  貼上以下 SQL，然後點 **"Run"**：

```sql
-- 群組資訊
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  bot_joined_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- 使用者綁定
CREATE TABLE user_bindings (
  id SERIAL PRIMARY KEY,
  group_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  bound_by TEXT NOT NULL,
  bound_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, display_name)
);

-- 活動排程
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_message TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  events JSONB NOT NULL DEFAULT '[]'
);
```

---

## 5. 第四關：部署到 Render

Render 是免費的網站託管服務。

### 5-1. 建立帳號

1.  去 [Render](https://render.com/)，點 **"Get Started for Free"**。
2.  用 GitHub 帳號登入。

### 5-2. 建立 Web Service

1.  在 Dashboard 點 **"New +"** → **"Web Service"**。
2.  選 **"Build and deploy from a Git repository"** → "Next"。
3.  連結你的 GitHub，選擇 Fork 的 `line_event_notifier`。
4.  設定：
    *   **Name**：`line-notifier`
    *   **Region**：`Singapore (Southeast Asia)` 或 `Oregon (US West)`
    *   **Branch**：`main`
    *   **Runtime**：`Docker`
    *   **Instance Type**：選 **Free**

### 5-3. 設定環境變數

在同一頁面往下滑，找到 **"Environment Variables"**，點 **"Add Environment Variable"**：

| Key | Value |
|-----|-------|
| `LINE_CHANNEL_ACCESS_TOKEN` | 你的長鑰匙 |
| `LINE_CHANNEL_SECRET` | 你的短鑰匙 |
| `DATABASE_URL` | Supabase 的連線 URI |
| `PORT` | `8080` |

### 5-4. 部署

1.  點最下面的 **"Create Web Service"**。
2.  等待部署完成 (約 5-10 分鐘)。
3.  部署完成後，複製上方的 **URL** (例如 `https://line-notifier.onrender.com`)。

### 5-5. 設定 LINE Webhook

1.  回到 LINE Developers 的 Messaging API 頁籤。
2.  Webhook URL 填入：`你的Render網址/webhook`
    *   例如：`https://line-notifier.onrender.com/webhook`
3.  點 "Verify"，成功後打開 "Use webhook"。

---

## 6. 第五關：設定定時提醒

Render 免費版不支援 Cron Job，但我們可以用免費的外部服務來定時觸發。

### 方法：使用 cron-job.org

1.  去 [cron-job.org](https://cron-job.org/)，免費註冊帳號。
2.  登入後點 **"CREATE CRONJOB"**。
3.  設定：
    *   **Title**：`LINE Notifier Weekly`
    *   **URL**：`你的Render網址/trigger-reminder`
    *   **Schedule**：
        *   選 "Every week"
        *   Day of week：**Saturday**
        *   Time：**09:00**
        *   Timezone：**Asia/Taipei**
    *   **Request Method**：**POST**
4.  點 "CREATE"。

> 💡 **省流量小技巧**：Render 免費版會在 15 分鐘沒流量後休眠。
> 可以在 cron-job.org 再建一個每 14 分鐘 GET 一次 `/health` 的任務來保持喚醒。

---

## 7. 第六關：測試與使用

1.  在 LINE Developers 掃 QR Code 加機器人好友。
2.  把機器人邀請進群組。
3.  測試指令：
    *   `!幫助` → 顯示使用說明
    *   `!綁定 王小明` → 綁定你的名字
    *   `!測試提醒` → 測試提醒功能

---

## 🎉 完成！

**指令列表**：
| 指令 | 說明 |
|------|------|
| `!綁定 <名稱>` | 綁定名稱 |
| `!解綁` | 解除綁定 |
| `!查詢` | 查詢綁定 |
| `!列表` | 列出所有綁定 |
| `!測試提醒` | 測試提醒 |
| `!幫助` | 顯示說明 |

---

## ⚠️ 重要提醒

此版本需要修改程式碼，將 Firestore 改成 Supabase。主要需要修改：
- `src/services/firestore.ts` → 改成使用 `@supabase/supabase-js`
- 環境變數從 `GCP_PROJECT_ID` 改成 `DATABASE_URL`

如果需要 Supabase 版本的程式碼，請另外開發或等待專案更新。
