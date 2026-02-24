# === 階段 1：編譯 TypeScript ===
FROM node:20-slim AS builder

WORKDIR /app

# 安裝所有依賴（包含 devDependencies 以便編譯 TypeScript）
COPY package*.json ./
RUN npm ci

# 複製原始碼並編譯
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# === 階段 2：只保留生產環境需要的檔案 ===
FROM node:20-slim

WORKDIR /app

# 只安裝生產環境依賴
COPY package*.json ./
RUN npm ci --omit=dev

# 從 builder 階段複製編譯後的程式碼
COPY --from=builder /app/dist/ ./dist/

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080
ENV TZ=Asia/Taipei

# 暴露埠號
EXPOSE 8080

# 啟動應用
CMD ["node", "dist/index.js"]
