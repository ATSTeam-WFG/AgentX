FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma/ ./prisma/
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm ci
RUN npx prisma generate
RUN npm run build

# ---- production image ----
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma/ ./prisma/

RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
