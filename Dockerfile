FROM node:20-slim

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci --only=production

# 複製編譯後的程式碼
COPY dist/ ./dist/

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080
ENV TZ=Asia/Taipei

# 暴露埠號
EXPOSE 8080

# 啟動應用
CMD ["node", "dist/index.js"]
