# DiraBook – production Dockerfile for GCP Cloud Run
# Build: docker build -t dirabook .
# Run:   docker run -p 3000:3000 -e MONGODB_URI=... -e NEXT_PUBLIC_APP_URL=... dirabook

# -----------------------------------------------------------------------------
# Stage 1: build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Build the app (produces .next/standalone, .next/static)
COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: run
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Prefer IPv4 when resolving DNS (e.g. mongodb+srv). Avoids TLS "internal error" (alert 80)
# in Cloud Run when Atlas is reached over IPv6 in some network paths.
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
EXPOSE 3000

# Ensure CA certs are present for TLS (e.g. MongoDB Atlas)
RUN apk add --no-cache ca-certificates

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output and assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run sets PORT; Next.js standalone listens on process.env.PORT
CMD ["node", "server.js"]
