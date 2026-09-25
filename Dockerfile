# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install DSH globally for headless mode
RUN npm install -g @deepseek-ai/dsh@latest

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create sessions directory with proper permissions
RUN mkdir -p /app/sessions && chmod 755 /app/sessions

# Create sessions directory for the bot
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -D -s /bin/sh
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]