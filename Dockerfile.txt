# Multi-stage Dockerfile for CRM WhatsApp AI
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Builder stage
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p /app/logs /app/temp /app/uploads
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]