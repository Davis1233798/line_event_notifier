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

## 4. 第三關：申請 Google Cloud (GCP)
我們要租 Google 的電腦來讓機器人從早到晚運作。

1.  **註冊 GCP**：
    *   去 [Google Cloud Console](https://console.cloud.google.com/)。
    *   登入 Google 帳號，並啟用免費試用 (需要信用卡驗證，但有免費額度)。

2.  **建立專案**：
    *   點擊左上角的專案選單，選擇 "New Project"。
    *   Project Name 取個名字，例如 `line-notifier`。
    *   記下你的 **Project ID** (專案 ID)，等等會用到。

3.  **開啟必要功能 (API)**：
    *   在搜尋列輸入並啟用以下四個功能：
        1.  **Cloud Run** (機器人住的地方)
        2.  **Cloud Build** (幫忙蓋房子)
        3.  **Cloud Scheduler** (定時鬧鐘)
        4.  **Firestore** (機器人的筆記本)

4.  **設定 Firestore (筆記本)**：
    *   搜尋 "Firestore"，選擇 "Create Database"。
    *   模式選 "Native mode"。
    *   Location (地點) 選 `asia-east1` (台灣) 或 `asia-northeast1` (東京)。

---

## 5. 第四關：啟動機器人！
這一步稍微難一點點，但我們可以用最簡單的方法：**Google Cloud Shell** (雲端黑框框)。

1.  **打開 Cloud Shell**：
    *   在 GCP 網頁右上角，點一個像「終端機」的圖示 (>_)。
    *   下面會跳出一個黑色視窗。

2.  **把程式碼放上去**：
    *   在 Cloud Shell 視窗點 "Open Editor" (或是點三個點 -> Upload)。
    *   把你第一關下載的程式碼整包上傳上去。 (或者如果你會用 git，直接 `git clone` 你的專案)。

3.  **設定環境變數 (告訴機器人鑰匙在哪)**：
    *   在黑色視窗輸入以下指令 (要把 `xxx` 換成你剛剛拿到的資料)：
    
    ```bash
    # 設定你的專案 ID
    gcloud config set project [你的Project_ID]

    # 設定機器人的鑰匙 (全部貼在同一行執行)
    gcloud run deploy line-notifier \
      --source . \
      --platform managed \
      --region asia-east1 \
      --allow-unauthenticated \
      --set-env-vars "LINE_CHANNEL_ACCESS_TOKEN=你的長長鑰匙(Token),LINE_CHANNEL_SECRET=你的短短鑰匙(Secret),GCP_PROJECT_ID=你的Project_ID"
    ```

4.  **等待部署**：
    *   按 Enter 執行。如果問你要不要啟用 API，選 `y`。
    *   等它跑完，最後會出現一個 **Service URL** (網址)，把它複製起來！

5.  **設定 Webhook (接電話)**：
    *   回到 **LINE Developers** 的 **Messaging API** 頁籤。
    *   找到 **"Webhook URL"**，按 Edit。
    *   貼上剛剛的 Service URL。
    *   **重要：** 網址後面要記得加上 `/webhook`。
        *   例如：`https://你的網址.../webhook`
    *   按下 "Verify"，如果出現 Success 就是成功了！
    *   打開 "Use webhook" 的開關。

6.  **設定每週鬧鐘 (Cloud Scheduler)**：
    *   回到 Cloud Shell，執行這個指令 (把 URL 換成你的 Service URL)：
    
    ```bash
    gcloud scheduler jobs create http line-notifier-weekly \
      --schedule="0 9 * * 6" \
      --time-zone="Asia/Taipei" \
      --uri="[你的Service_URL]/trigger-reminder" \
      --http-method=POST \
      --location=asia-east1
    ```
    *   這樣每週六早上 9 點就會觸發提醒了！

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
