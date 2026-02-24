# 🤖 LINE 活動提醒機器人 - 超簡單使用手冊

這本手冊會教你如何從零開始，建立一個可以幫忙記錄群組活動、每週自動提醒大家的 LINE 機器人！

---

## 📖 目錄

1. [這是什麼？](#1-這是什麼)
2. [第一關：Fork 專案到你的 GitHub](#2-第一關fork-專案到你的-github)
3. [第二關：申請 LINE Bot](#3-第二關申請-line-bot)
4. [第三關：申請 Google Cloud 與 Firebase](#4-第三關申請-google-cloud-與-firebase)
5. [第四關：部署機器人！](#5-第四關部署機器人)
6. [第五關：測試與使用](#6-第五關測試與使用)

---

## 1. 這是什麼？

這是一個住在 LINE 群組裡的機器人。
*   **它的工作**：幫忙記住大家發布的活動，然後在每週六早上提醒大家下週有什麼活動。
*   **它的特技**：你可以跟它說「我是誰」，它就會記住你的 LINE 名字，提醒的時候會直接叫你的名字喔！

---

## 2. 第一關：Fork 專案到你的 GitHub

**Fork (分叉)** 就像是把別人的筆記本複製一份到你自己的書包裡。

1.  **登入 GitHub**：
    *   如果沒有帳號，先去 [GitHub](https://github.com/) 註冊一個。
    *   登入你的帳號。

2.  **Fork 專案**：
    *   點這個連結：👉 [https://github.com/Davis1233798/line_event_notifier](https://github.com/Davis1233798/line_event_notifier)
    *   點右上角的 **"Fork"** 按鈕。
    *   在彈出的視窗直接點 **"Create fork"**。
    *   完成！現在你的 GitHub 裡面就有一份專案副本了。

---

## 3. 第二關：申請 LINE Bot

我們要去 LINE 公司幫機器人申請一張「身分證」。

1.  **登入 LINE Developers**：
    *   去 [LINE Developers Console](https://developers.line.biz/console/)。
    *   用你的 LINE 帳號登入。

2.  **建立 Provider (供應商)**：
    *   如果你是第一次來，點擊 "Create a new provider"。
    *   名字隨便取，例如 "我的提醒機器人"。

3.  **建立 Channel (頻道)**：
    *   選擇 **"Messaging API"** (這很重要！)。
    *   **Channel name**：幫機器人取個名字，例如 "活動小幫手"。
    *   **Channel description**：隨便寫，例如 "提醒大家活動"。
    *   **Category**：選 "Groups & Communities" 或其他都可以。
    *   最後勾選同意條款，點 "Create"。

4.  **拿鑰匙 (重要資料)**：
    *   建立好後，你會看到機器人的設定頁面。
    *   **Basic settings** 頁籤：找到 **"Channel Secret"**，按 Issue 產生並複製下來 (這是一號鑰匙 🗝️)。
    *   **Messaging API** 頁籤：滑到最下面找到 **"Channel access token"**，按 Issue 產生並複製下來 (這是二號鑰匙 🗝️)。

5.  **關閉自動回覆**：
    *   在 **Messaging API** 頁籤，找到 "Auto-reply messages"，點擊 "Edit"。
    *   把 "Auto-response" 關掉 (Disabled)。
    *   把 "Greeting message" 也關掉 (Disabled)。

---

## 4. 第三關：申請 Google Cloud 與 Firebase

我們要租 Google 的電腦來讓機器人運作，還要幫它準備一本筆記本 (Firebase)。

### 4-1. 設定 Google Cloud

1.  **註冊 GCP**：
    *   去 [Google Cloud Console](https://console.cloud.google.com/)。
    *   登入 Google 帳號，啟用免費試用 (需要信用卡驗證，但有免費額度)。

2.  **建立專案**：
    *   點左上角的專案選單 → "New Project"。
    *   Project Name 取名，例如 `line-notifier`。
    *   記下你的 **Project ID**，等等會用到。

3.  **開啟必要 API**：
    *   在搜尋列搜尋並啟用以下服務：
        1.  **Cloud Run API**
        2.  **Cloud Build API**
        3.  **Cloud Scheduler API**

### 4-2. 設定 Firebase (機器人的筆記本)

1.  **進入 Firebase Console**：
    *   去 [Firebase Console](https://console.firebase.google.com/)。
    *   用同一個 Google 帳號登入。

2.  **連結 GCP 專案**：
    *   點 "新增專案" 或 "Add project"。
    *   **重要！** 選擇你剛剛在 GCP 建立的專案 (例如 `line-notifier`)。
    *   Google Analytics 選「不啟用」，點 "Create project"。

3.  **建立 Firestore 資料庫**：
    *   在左邊選單，點 **"Build"** → **"Firestore Database"**。
    *   點 **"Create database"**。
    *   選 **"Start in production mode"**。
    *   Location 選 **`asia-east1` (台灣)**。
    *   點 "Enable"。

---

## 5. 第四關：部署機器人！

全部都用網頁操作，不需要打指令！

### 步驟 A：建立 GCP 服務帳號

1.  在 GCP Console 搜尋 **"IAM & Admin"** → **"Service Accounts"**。
2.  點 **"+ CREATE SERVICE ACCOUNT"**。
3.  名字取 `github-actions`，點 "CREATE AND CONTINUE"。
4.  加入以下權限 (Role)：
    *   `Cloud Run Admin`
    *   `Cloud Build Editor`
    *   `Storage Admin`
    *   `Service Account User`
5.  點 "DONE"。
6.  在列表點剛建的帳號 → "KEYS" → "ADD KEY" → "Create new key" → 選 JSON → "CREATE"。
7.  會下載一個 `.json` 檔案，**保存好！**

### 步驟 B：設定 GitHub Secrets

1.  進入你 Fork 的 GitHub repository 頁面。
2.  點 **"Settings"** → **"Secrets and variables"** → **"Actions"**。
3.  點 **"New repository secret"**，新增以下四個：

    | Name | Value |
    |------|-------|
    | `GCP_PROJECT_ID` | 你的 GCP 專案 ID |
    | `GCP_SA_KEY` | 貼上 JSON 檔案的**全部內容** |
    | `LINE_CHANNEL_ACCESS_TOKEN` | 你的長鑰匙 (Token) |
    | `LINE_CHANNEL_SECRET` | 你的短鑰匙 (Secret) |

### 步驟 C：部署 Cloud Run

1.  在 GCP Console 搜尋 **"Cloud Run"**，點進去。
2.  點 **"+ CREATE SERVICE"**。
3.  選 **"Continuously deploy from a repository"**。
4.  點 **"SET UP WITH CLOUD BUILD"**。
5.  連結 GitHub，選擇你 Fork 的 `line_event_notifier`。
6.  Branch 選 `main`，Build Type 選 **Dockerfile**，點 "SAVE"。
7.  設定服務：
    *   Service name：`line-notifier`
    *   Region：`asia-east1`
    *   Authentication：**Allow unauthenticated invocations**
8.  展開 "Container, Networking, Security" → "VARIABLES & SECRETS"，加入環境變數：
    *   `LINE_CHANNEL_ACCESS_TOKEN`：你的長鑰匙
    *   `LINE_CHANNEL_SECRET`：你的短鑰匙
    *   `GCP_PROJECT_ID`：你的專案 ID
9.  點 **"CREATE"**，等待部署完成。
10. 完成後複製 **Service URL**！

### 步驟 D：設定 LINE Webhook

1.  回到 LINE Developers 的 **Messaging API** 頁籤。
2.  找到 **"Webhook URL"**，按 Edit。
3.  貼上 Service URL，**後面加上** `/webhook`。
    *   例如：`https://line-notifier-xxxxx.run.app/webhook`
4.  按 "Verify"，看到 Success 就成功了！
5.  打開 **"Use webhook"** 開關。

### 步驟 E：設定每週提醒 (Cloud Scheduler)

1.  在 GCP Console 搜尋 **"Cloud Scheduler"**。
2.  點 **"+ CREATE JOB"**。
3.  設定：
    *   Name：`line-notifier-weekly`
    *   Region：`asia-east1`
    *   Frequency：`0 9 * * 6` (每週六早上 9 點)
    *   Timezone：`Asia/Taipei`
4.  Target：
    *   Type：**HTTP**
    *   URL：`你的Service URL/trigger-reminder`
    *   Method：**POST**
5.  點 "CREATE"。

---

## 6. 第五關：測試與使用

1.  **加機器人好友**：
    *   在 LINE Developers 掃描 QR Code，加機器人好友。
    *   把機器人邀請進群組。

2.  **測試指令**：
    *   在群組輸入：`!幫助` → 機器人應該回覆使用說明。
    *   輸入：`!綁定 王小明` → 機器人會綁定你並私訊你。
    *   輸入：`!測試提醒` → 機器人會發送測試提醒。

---

## 🎉 恭喜完成！

**指令列表**：
| 指令 | 說明 |
|------|------|
| `!綁定 <名稱>` | 把自己綁定為該名稱 |
| `!解綁` | 解除自己的綁定 |
| `!查詢` | 查詢自己的綁定 |
| `!列表` | 列出所有綁定 |
| `!測試提醒` | 測試下週活動提醒 |
| `!幫助` | 顯示說明 |

**新增活動** (記得 @機器人)：
```
@活動小幫手
1月活動表
----------------
1/04(六) 聚餐: 王小明
1/11(六) 爬山: 李大華
```
