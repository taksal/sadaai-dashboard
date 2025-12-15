# Multi-stage build for NestJS Backend
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (ignore workspace, install independently)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Verify build output (show what was built)
RUN echo "=== Build output ===" && ls -laR dist/ && echo "=== Checking for main.js ===" && (test -f dist/main.js && echo "✓ dist/main.js found" || echo "✗ dist/main.js not found, checking dist/src/main.js") && (test -f dist/src/main.js && echo "✓ dist/src/main.js found" || echo "✗ No main.js found")

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init and OpenSSL 1.1 for Prisma
RUN apk add --no-cache dumb-init openssl1.1-compat

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (ignore workspace)
RUN npm install --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create symlink if main.js is in dist/src/
RUN if [ -f dist/src/main.js ] && [ ! -f dist/main.js ]; then ln -s src/main.js dist/main.js; fi

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port (Cloud Run uses PORT env var, defaults to 8080)
EXPOSE 8080

# Health check (uses PORT env var from Cloud Run)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8080; require('http').get('http://localhost:' + port + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
