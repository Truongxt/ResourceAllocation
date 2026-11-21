FROM node:20-alpine AS runner

WORKDIR /app

# Thiết lập môi trường production
ENV NODE_ENV=production

# Copy package files và cài đặt dependencies tối ưu cho production
COPY package*.json ./
RUN npm ci --omit=dev

# Copy mã nguồn backend
COPY . .

# Expose port mặc định của server
EXPOSE 5000

# Chạy server
CMD ["node", "server.js"]
