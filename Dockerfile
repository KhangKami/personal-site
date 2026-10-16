FROM node:20-alpine

WORKDIR /app

# Cài thư viện trước để tận dụng cache của Docker
COPY package*.json ./
RUN npm install --omit=dev

# Chép mã nguồn và giao diện
COPY server.js ./
COPY public ./public

ENV PORT=3000
EXPOSE 3000

# Chạy bằng user thường cho an toàn
USER node

CMD ["node", "server.js"]