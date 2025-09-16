# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install root dependencies
RUN npm ci

# Copy all files
COPY . .

# Build client
WORKDIR /app/client
RUN npm ci
RUN npm run build

# Build server
WORKDIR /app/server
RUN npm ci
RUN npm run build

# Production stage
FROM node:20-alpine
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max_old_space_size=2048

WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/server/public

# Copy server files and lock file
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/package-lock.json ./server/
COPY --from=builder /app/server/dist ./server/dist

# Copy built client files to server public directory
COPY --from=builder /app/client/dist ./server/public

WORKDIR /app/server

# Install only production dependencies using npm install instead of ci
RUN npm install --only=production

# Set up permissions
RUN chown -R node:node /app
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
