# ── Stage 1: Dependencies ─────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production Image ─────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nodeuser

# Copiar dependencias y código fuente
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

# Crear directorio de uploads con permisos correctos
RUN mkdir -p /app/uploads && chown -R nodeuser:nodejs /app/uploads

USER nodeuser

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
