# Workforce Tracker — Sistema de Gestión de Campo

Sistema SaaS de gestión de campo para monitoreo de personal en terreno (reponedores, vendedores, cobradores). Incluye backoffice web responsivo y API REST para app móvil Android.

---

## 🏗️ Arquitectura

```
                          ┌─────────────────┐
  Navegador / App Móvil ──► Nginx (Puerto 80) │
                          │  React SPA       │
                          │  ─── Proxy ───► │
                          └────────┬────────┘
                                   │ /api/*
                          ┌────────▼────────┐
                          │ Node.js + Express│
                          │  API (Puerto 3001│
                          └────────┬────────┘
                                   │ pg pool
                          ┌────────▼────────┐
                          │ PostgreSQL 16   │
                          │ + PostGIS 3.4   │
                          │  (Puerto 5432)  │
                          └─────────────────┘
```

---

## 🐳 Despliegue con Docker (Recomendado)

### Requisitos
- Docker ≥ 27.x
- Docker Compose ≥ 2.x

### 1. Clonar y configurar
```bash
git clone <repo-url>
cd wtracker-web

# El .env ya viene con valores por defecto para desarrollo
# Para producción, edita .env con secrets seguros
cp .env.example .env
```

### 2. Levantar todos los servicios
```bash
docker compose up -d
```

Esto inicia automáticamente:
| Contenedor | Descripción | Puerto |
|------------|-------------|--------|
| `wtracker_db` | PostgreSQL 16 + PostGIS 3.4 | 5432 |
| `wtracker_api` | Node.js + Express API | 3001 |
| `wtracker_web` | Nginx + React SPA | **80** |

> La migración SQL se ejecuta automáticamente en el primer arranque de la base de datos.

### 3. Abrir la aplicación
```
http://localhost
```

### Comandos útiles
```bash
# Ver estado de todos los servicios
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f db

# Detener todo (preserva datos)
docker compose down

# Detener y eliminar volúmenes (⚠️ elimina la DB)
docker compose down -v

# Reconstruir imágenes tras cambios en código
docker compose build --no-cache
docker compose up -d
```

---

## 🌐 Acceso Remoto con Cloudflare Tunnel

Para exponer el sistema a internet de forma segura usando un subdominio fijo (ej. `wtracker.simpler.bo`):

1. **Instalar `cloudflared`** (en Mac: `brew install cloudflared`).
2. **Iniciar sesión en Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```
3. **Crear el archivo de configuración** en `~/.cloudflared/wtracker-web-config.yml`:
   ```yaml
   tunnel: <ID-DEL-TUNEL>
   credentials-file: /Users/<tu-usuario>/.cloudflared/<ID-DEL-TUNEL>.json
   
   ingress:
     - hostname: wtracker.simpler.bo
       service: http://localhost:80
     - service: http_status:404
   ```
4. **Iniciar el túnel**:
   ```bash
   cloudflared tunnel --config ~/.cloudflared/wtracker-web-config.yml run wtracker-web
   ```

---

## 🔑 Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email | `admin@wtracker.com` |
| Password | `Admin@1234` |

> **Importante:** Cambia la contraseña del admin en producción.

---

## 🚀 API Reference

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login + JWT access + refresh token |
| POST | `/api/v1/auth/refresh` | Renovar access token |
| POST | `/api/v1/auth/logout` | Revocar refresh token |
| GET  | `/api/v1/auth/me` | Perfil del usuario autenticado |

### Backoffice (requiere JWT)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | KPIs del día |
| GET | `/api/v1/dashboard/map` | Datos mapa en tiempo real |
| GET | `/api/v1/dashboard/cross-data` | Matriz cruce vendedor/reponedor |
| GET/POST | `/api/v1/users` | Gestión de usuarios |
| GET/PUT/DELETE | `/api/v1/users/:id` | Usuario específico |
| GET | `/api/v1/users/:id/performance` | Métricas de rendimiento |
| GET/POST | `/api/v1/clients` | Directorio de clientes |
| GET/PUT/DELETE | `/api/v1/clients/:id` | Cliente específico |
| GET | `/api/v1/visits` | Historial de visitas |

### Móvil (requiere JWT)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET  | `/api/v1/mobile/clients` | Lista de clientes optimizada |
| POST | `/api/v1/mobile/visits` | Registrar visita (GPS + estado) |
| POST | `/api/v1/mobile/visits/:id/evidence` | Subir foto o firma digital |
| GET  | `/api/v1/mobile/sync` | Sincronización periódica |

---

## 💻 Desarrollo Local (sin Docker)

### Backend
```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL local
# Ejecuta backend/migrations/001_initial_schema.sql en tu DB

npm install
npm run dev    # http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api/v1

npm install
npm run dev    # http://localhost:5173
```

---

## 📂 Estructura del Proyecto

```
wtracker-web/
├── docker-compose.yml          # Orquestación de contenedores
├── .env                        # Variables de entorno (no commitear)
├── .env.example                # Plantilla de variables
│
├── backend/                    # API Server (Node.js + Express)
│   ├── Dockerfile
│   ├── src/
│   │   ├── configs/            # db, jwt, multer
│   │   ├── controllers/        # auth, user, client, visit
│   │   ├── middlewares/        # auth, error
│   │   ├── routes/             # auth, users, clients, dashboard, mobile
│   │   ├── services/           # Lógica de negocio
│   │   ├── utils/              # responseFormatter
│   │   └── validations/        # Zod schemas
│   └── migrations/
│       └── 001_initial_schema.sql
│
└── frontend/                   # SPA (React + Vite + TypeScript)
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── styles/             # tokens.css, layout.css, components.css
        ├── store/              # Zustand auth store
        ├── services/           # Axios API clients
        ├── components/         # Layout, Maps
        └── pages/              # Dashboard, Users, Clients, Monitoring, CrossData, Evidence
```

---

## 🧰 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Vanilla CSS con Design Tokens |
| Estado | Zustand |
| Mapas | Leaflet.js |
| Backend | Node.js + Express.js |
| Auth | JWT (access 15min + refresh 7d) |
| Validación | Zod |
| Base de Datos | PostgreSQL 16 + PostGIS 3.4 |
| Servidor Web | Nginx 1.27 |
| Contenedores | Docker + Docker Compose |