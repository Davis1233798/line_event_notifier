# LINE 群組活動提醒機器人

一個用於 LINE 群組的活動提醒機器人，可以記錄活動排程並在每週六自動發送提醒。

## 功能

- 📅 **活動排程記錄**：在群組中 @ 機器人並貼上活動訊息，自動解析並儲存
- 🔔 **每週提醒**：每週六早上自動發送下週活動提醒
- 👤 **使用者綁定**：將群組成員綁定到活動中的名稱，提醒時顯示 LINE 名稱
- 📋 **指令系統**：支援綁定、查詢、列表等指令

## 技術架構

- **Runtime**：Node.js 20 + TypeScript
- **Framework**：Express.js
- **LINE SDK**：@line/bot-sdk
- **Database**：Google Cloud Firestore
- **Hosting**：Google Cloud Run
- **Scheduler**：Google Cloud Scheduler

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env` 並填入設定：

```bash
cp .env.example .env
```

```env
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
GCP_PROJECT_ID=your_project_id
```

### 3. 本地開發

```bash
npm run dev
```

### 4. 使用 ngrok 測試

```bash
ngrok http 8080
```

將 ngrok 產生的 URL 設定到 LINE Developers Console 的 Webhook URL。

## 部署到 Cloud Run

### 1. 建置 Docker 映像

```bash
# 編譯 TypeScript
npm run build

# 建置並推送到 Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/line-notifier
```

### 2. 部署 Cloud Run

```bash
gcloud run deploy line-notifier \
  --image gcr.io/YOUR_PROJECT_ID/line-notifier \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars "LINE_CHANNEL_ACCESS_TOKEN=xxx,LINE_CHANNEL_SECRET=xxx,GCP_PROJECT_ID=xxx"
```

### 3. 設定 Cloud Scheduler

```bash
gcloud scheduler jobs create http line-notifier-weekly \
  --schedule="0 9 * * 6" \
  --time-zone="Asia/Taipei" \
  --uri="https://YOUR_CLOUD_RUN_URL/trigger-reminder" \
  --http-method=POST \
  --location=asia-east1
```

## 使用說明 📖

### 🤖 這是什麼？

這是一個 **LINE 機器人**，可以幫你記住活動時間，還會在每週六早上 8 點自動提醒大家！

---

### 📝 怎麼告訴機器人活動時間？

1. 把機器人加入你的 LINE 群組
2. 在群組裡 **@ 機器人**，然後貼上活動訊息

**範例：**
```
@機器人 115年1-4月音響活動
--------------------------
1/04(日)共修: 小明
1/11(日)法會: 小明、小華
1/18(日)共修: 小華
```

機器人就會記住這些活動啦！🎉

---

### ✨ 可以用的指令

在群組或私訊中輸入這些指令：

| 指令 | 做什麼用的？ | 範例 |
|------|-------------|------|
| `!綁定 <名稱>` | 告訴機器人「我就是這個名字」 | `!綁定 小明` |
| `!解綁` | 取消我的綁定 | `!解綁` |
| `!查詢` | 看看我綁定了什麼名字 | `!查詢` |
| `!列表` | 看群組裡誰綁定了 | `!列表` |
| `!測試提醒` | 測試看看提醒會長什麼樣子 | `!測試提醒` |
| `!正式日期測試` | 測試正式日期範圍的提醒 | `!正式日期測試` |
| `!用量` | 看這個月機器人發了幾則訊息 | `!用量` |
| `!幫助` | 看所有指令說明 | `!幫助` |

---

### 💬 私訊也可以用！

直接私訊機器人，可以用這些指令（不會浪費群組的訊息額度喔）：
- `!幫助` - 看說明
- `!用量` - 看訊息用量

---

### 🔔 自動提醒

每週六早上 8:00，機器人會自動在群組發送下週的活動提醒！

如果你有綁定名字，還會收到**私訊提醒**哦！

---

### ❓ 常見問題

**Q: 為什麼機器人回覆很慢？**
A: 第一次傳訊息時，機器人需要「醒來」，大約要等 2-5 秒。之後就會變快啦！

**Q: 為什麼我沒收到私訊？**
A: 請確認你有**加機器人為好友**喔！

---

## Firestore 資料結構

```
├── groups/
│   └── {groupId}/
│       └── userBindings/
│           └── {displayName}  # UserBinding
└── schedules/
    └── {scheduleId}  # Schedule
```

## License

MIT

