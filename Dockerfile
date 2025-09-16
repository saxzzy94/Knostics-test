FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max_old_space_size=2048

WORKDIR /app

COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/public ./server/public

WORKDIR /app/server

RUN npm ci --only=production --omit=dev

RUN chown -R node:node /app
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
