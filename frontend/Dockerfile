FROM node:20-alpine

WORKDIR /app

# نصب وابستگی‌ها
COPY package*.json ./
RUN npm install --registry=https://registry.npmmirror.com

# کپی سورس‌کد
COPY . .

EXPOSE 3000

# اجرای نکست در حالت توسعه با Hot-Reload
CMD ["npm", "run", "dev"]
