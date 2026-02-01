# 🤖 LINE 活動提醒機器人 - 超簡單使用手冊

這本手冊會教你如何從零開始，建立一個可以幫忙記錄群組活動、每週自動提醒大家的 LINE 機器人！

---

## 📖 目錄

1. [這是什麼？](#1-這是什麼)
2. [第一關：申請 GitHub](#2-第一關申請-github)
3. [第二關：申請 LINE Bot](#3-第二關申請-line-bot)
4. [第三關：申請 Google Cloud](#4-第三關申請-google-cloud)
5. [第四關：啟動機器人！](#5-第四關啟動機器人)
6. [第五關：測試與使用](#6-第五關測試與使用)

---

## 1. 這是什麼？

這是一個住在 LINE 群組裡的機器人。
*   **它的工作**：幫忙記住大家發布的活動，然後在每週六早上提醒大家下週有什麼活動。
*   **它的特技**：你可以跟它說「我是誰」，它就會記住你的 LINE 名字，提醒的時候會直接叫你的名字喔！

---

## 2. 第一關：申請 GitHub
**(如果你已經有 GitHub 帳號，可以跳過這一步)**

GitHub 就像是程式碼的圖書館，我們要先把機器人的程式碼放在這裡。

1.  **註冊帳號**：
    *   到 [GitHub 官網](https://github.com/) 點擊右上角的 "Sign up"。
    *   輸入你的 Email 和密碼，跟著步驟完成註冊。

2.  **下載程式碼**：
    *   回到你現在看到的這份專案，點擊綠色的 "Code" 按鈕，然後選擇 "Local" -> "Download ZIP"。
    *   把下載下來的檔案解壓縮。

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
    *   把 "Greeting message" (加入好友歡迎詞) 也關掉 (Disabled)。

---

## 4. 第三關：申請 Google Cloud 與 Firebase
我們要租 Google 的電腦來讓機器人從早到晚運作，還要幫機器人準備一本筆記本 (Firebase)。

### 4-1. 設定 Google Cloud

1.  **註冊 GCP**：
    *   去 [Google Cloud Console](https://console.cloud.google.com/)。
    *   登入 Google 帳號，並啟用免費試用 (需要信用卡驗證，但有免費額度)。

2.  **建立專案**：
    *   點擊左上角的專案選單，選擇 "New Project"。
    *   Project Name 取個名字，例如 `line-notifier`。
    *   記下你的 **Project ID** (專案 ID)，等等會用到。

3.  **開啟必要功能 (API)**：
    *   在搜尋列輸入並啟用以下三個功能：
        1.  **Cloud Run API** (機器人住的地方)
        2.  **Cloud Build API** (幫忙蓋房子)
        3.  **Cloud Scheduler API** (定時鬧鐘)

### 4-2. 設定 Firebase (機器人的筆記本)

Firebase 是 Google 提供的資料庫服務，機器人會用它來記住活動和綁定資料。

1.  **進入 Firebase Console**：
    *   去 [Firebase Console](https://console.firebase.google.com/)。
    *   用同一個 Google 帳號登入。

2.  **新增專案 (連結 GCP 專案)**：
    *   點 "新增專案" 或 "Add project"。
    *   **重要！** 在專案名稱欄位，選擇你剛剛在 GCP 建立的專案 (例如 `line-notifier`)。
    *   這樣 Firebase 就會跟 GCP 共用同一個專案。
    *   Google Analytics 可以選「不啟用」，然後點 "Create project"。

3.  **建立 Firestore 資料庫**：
    *   在 Firebase 左邊選單，點 **"Build"** → **"Firestore Database"**。
    *   點 **"Create database"**。
    *   選 **"Start in production mode"** (正式模式)。
    *   Location 選 **`asia-east1` (台灣)** 或 `asia-northeast1` (東京)。
    *   點 "Enable"，等它建立完成。

4.  **設定安全規則 (讓機器人可以讀寫)**：
    *   在 Firestore Database 頁面，點上方的 **"Rules"** 頁籤。
    *   把規則改成這樣 (允許伺服器端存取)：
    
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if false;
        }
      }
    }
    ```
    
    *   點 "Publish"。
    *   **說明**：這個規則禁止網頁直接存取，但我們的機器人是用「服務帳號」存取的，所以不受這個規則影響，這樣比較安全！

---

## 5. 第四關：啟動機器人！
這一步我們會用 **GitHub Actions** 自動幫你部署，你只需要在網頁上點點點就好！

### 步驟 A：把程式碼放到 GitHub

1.  **建立新 Repository**：
    *   登入 [GitHub](https://github.com/)，點右上角的 "+" 選 "New repository"。
    *   Repository name 取名為 `line-notifier`。
    *   選 **Private** (私人)。
    *   點 "Create repository"。

2.  **上傳程式碼**：
    *   在新建的 repository 頁面，點 "uploading an existing file"。
    *   把你下載的程式碼資料夾裡的**所有檔案**拖進去。
    *   點 "Commit changes"。

### 步驟 B：設定 GCP 服務帳號 (給 GitHub 權限去 GCP 部署)

1.  **建立服務帳號**：
    *   在 GCP Console 搜尋 **"IAM & Admin"**，選 **"Service Accounts"**。
    *   點 "+ CREATE SERVICE ACCOUNT"。
    *   Service account name 取名 `github-actions`。
    *   點 "CREATE AND CONTINUE"。

2.  **給權限**：
    *   在 "Grant this service account access to project" 頁面，加入以下角色：
        *   `Cloud Run Admin`
        *   `Cloud Build Editor`
        *   `Storage Admin`
        *   `Service Account User`
    *   點 "CONTINUE" 然後 "DONE"。

3.  **產生金鑰 (JSON 檔案)**：
    *   在服務帳號列表中，點剛剛建立的 `github-actions` 帳號。
    *   點 "KEYS" 頁籤 → "ADD KEY" → "Create new key"。
    *   選 **JSON**，點 "CREATE"。
    *   會自動下載一個 `.json` 檔案，**這個很重要，保存好！**

### 步驟 C：在 GitHub 設定秘密

1.  **進入 GitHub Secrets**：
    *   在你的 GitHub repository 頁面，點 "Settings" → "Secrets and variables" → "Actions"。
    *   點 "New repository secret"。

2.  **新增以下 Secrets** (一個一個新增)：

    | Name | Value (值) |
    |------|------------|
    | `GCP_PROJECT_ID` | 你的 GCP 專案 ID |
    | `GCP_SA_KEY` | 把剛剛下載的 JSON 檔案**整個內容**複製貼上 |
    | `LINE_CHANNEL_ACCESS_TOKEN` | 你的 LINE Channel Access Token (長長的那個) |
    | `LINE_CHANNEL_SECRET` | 你的 LINE Channel Secret (短短的那個) |

### 步驟 D：部署 Cloud Run (用網頁操作)

1.  **進入 Cloud Run**：
    *   在 GCP Console 搜尋 **"Cloud Run"**，點進去。
    *   點 "+ CREATE SERVICE"。

2.  **設定服務來源**：
    *   選 "Continuously deploy from a repository (source or function)"。
    *   點 "SET UP WITH CLOUD BUILD"。
    *   連結你的 GitHub 帳號，選擇 `line-notifier` repository。
    *   Branch 選 `main` 或 `master`。
    *   Build Type 選 **Dockerfile**。
    *   點 "SAVE"。

3.  **設定服務**：
    *   Service name：`line-notifier`
    *   Region：`asia-east1` (台灣)
    *   Authentication：選 **"Allow unauthenticated invocations"** (允許任何人存取)

4.  **設定環境變數**：
    *   展開 "Container, Networking, Security"。
    *   點 "VARIABLES & SECRETS" 頁籤。
    *   點 "+ ADD VARIABLE"，加入：
        *   Name: `LINE_CHANNEL_ACCESS_TOKEN`，Value: 你的長長鑰匙
        *   Name: `LINE_CHANNEL_SECRET`，Value: 你的短短鑰匙
        *   Name: `GCP_PROJECT_ID`，Value: 你的專案 ID

5.  **建立服務**：
    *   點最下面的 "CREATE"。
    *   等待部署完成 (約 2-5 分鐘)。
    *   完成後會看到一個 **Service URL**，複製下來！

### 步驟 E：設定 LINE Webhook

1.  **回到 LINE Developers**：
    *   進入你的 Channel 的 **Messaging API** 頁籤。
    *   找到 **"Webhook URL"**，按 Edit。
    *   貼上 Cloud Run 的 Service URL，**後面加上** `/webhook`。
        *   例如：`https://line-notifier-xxxxx.run.app/webhook`
    *   按 "Verify"，看到 Success 就成功了！
    *   打開 **"Use webhook"** 開關。

### 步驟 F：設定每週提醒 (Cloud Scheduler)

1.  **進入 Cloud Scheduler**：
    *   在 GCP Console 搜尋 **"Cloud Scheduler"**，點進去。
    *   點 "+ CREATE JOB"。

2.  **設定排程**：
    *   Name：`line-notifier-weekly`
    *   Region：`asia-east1`
    *   Frequency：`0 9 * * 6` (代表每週六早上 9 點)
    *   Timezone：`Asia/Taipei`

3.  **設定目標**：
    *   Target type：**HTTP**
    *   URL：你的 Service URL + `/trigger-reminder`
        *   例如：`https://line-notifier-xxxxx.run.app/trigger-reminder`
    *   HTTP method：**POST**

4.  點 "CREATE"，完成！

---

## 6. 第五關：測試與使用
機器人醒了！快來試試看。

1.  **邀請機器人**：
    *   在 LINE Developers 掃描 QR Code，加機器人好友。
    *   把機器人邀請進一個群組。

2.  **打聲招呼**：
    *   在群組輸入：`!幫助`
    *   機器人應該要回覆你一串使用說明。

3.  **綁定測試 (讓機器人認識你)**：
    *   輸入：`!綁定 王小明`
    *   機器人會回覆：「✅ 王小明 已綁定...」並且會私訊你一條測試訊息。
        *   *注意：你必須先加機器人好友，它才能私訊你喔！*

4.  **測試提醒功能**：
    *   輸入：`!測試提醒`
    *   機器人會假裝現在是週六，發送下週的活動提醒給你看。

---

### 🎉 恭喜！你成功了！
現在你可以開始在群組裡貼活動排程，機器人就會自動幫你記下來囉！

**排程格式範例**：
(記得要 @機器人)
```
@活動小幫手
1月活動表
----------------
1/04(六) 聚餐: 王小明
1/11(六) 爬山: 李大華
```
