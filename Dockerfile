FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev=false

COPY . .
RUN npm run build

# ---- dev (hot-reload) ----
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev=false

CMD ["npm", "run", "dev"]

# ---- runtime ----
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY lang ./lang
COPY tsconfig.json ./

# config/config.json is mounted via docker-compose volume (not baked in)
# to keep secrets out of the image
EXPOSE 3001

CMD ["node", "--enable-source-maps", "dist/start-bot.js"]
