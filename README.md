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

## 使用說明

### 新增活動排程

在群組中 @ 機器人並貼上活動訊息：

```
@機器人 115年1-4月音響活動發心
🚩共修早上10:00~12:00
🚩法會早上09:00~12:00
--------------------------
1/04(日)共修: user1
1/11(日)共修: user2
1/18(日)法會: user1、user2
```

### 指令列表

| 指令 | 說明 |
|------|------|
| `!綁定 <名稱>` | 將自己綁定為指定名稱 |
| `!解綁` | 解除自己的綁定 |
| `!查詢` | 查詢自己的綁定 |
| `!列表` | 列出所有綁定 |
| `!測試提醒` | 測試下週活動提醒 |
| `!幫助` | 顯示說明 |

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
