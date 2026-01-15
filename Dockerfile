# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build frontend and backend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/supabase ./supabase
COPY --from=builder /app/scripts ./scripts

# Make scripts executable
RUN chmod +x ./scripts/*.sh 2>/dev/null || true

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the server
CMD ["npm", "run", "start"]
