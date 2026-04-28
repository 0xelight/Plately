# ── Stage 1: deps ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Rebuild sharp for linux/musl
RUN npm rebuild sharp

# ── Stage 2: builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# ffmpeg is required by fluent-ffmpeg at runtime
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Public assets + standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Writable folder for generated media (videos, carousel images)
RUN mkdir -p public/outputs && chown nextjs:nodejs public/outputs

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
