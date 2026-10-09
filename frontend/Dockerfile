# ── Stage 1: Build React App ──────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Recibe variables como build arg para inyectar en tiempo de build
ARG VITE_API_URL=http://localhost:3001/api/v1
ARG VITE_DATE_LOCALE=es-CL
ARG VITE_DATE_FORMAT=short
ARG VITE_MAP_API_KEY=

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_DATE_LOCALE=${VITE_DATE_LOCALE}
ENV VITE_DATE_FORMAT=${VITE_DATE_FORMAT}
ENV VITE_MAP_API_KEY=${VITE_MAP_API_KEY}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Servir con Nginx ─────────────────────
FROM nginx:1.27-alpine AS runner

# Copiar build estático
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
