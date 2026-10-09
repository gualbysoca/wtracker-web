// src/server.js
// Punto de entrada principal del servidor Express

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');
const fs       = require('fs');

// ── App Initialization ────────────────────────────────────────────────────────
const app = express();

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const clientRoutes    = require('./routes/client.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const visitRoutes     = require('./routes/visit.routes');
const mobileRoutes    = require('./routes/mobile.routes');
const settingRoutes   = require('./routes/setting.routes');

// ── Error Handling ───────────────────────────────────────────────────────────
const { globalErrorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// ── Crear directorio de uploads si no existe ─────────────────────────────────
const UPLOAD_DIR_ENV = process.env.UPLOAD_DIR || 'uploads';
const uploadDir = path.isAbsolute(UPLOAD_DIR_ENV)
  ? UPLOAD_DIR_ENV
  : path.join(__dirname, '..', UPLOAD_DIR_ENV);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Middlewares Globales ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost',
  'http://localhost:80',
  'http://127.0.0.1',
  'https://wtracker.simpler.bo',
  'https://www.wtracker.simpler.bo'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite peticiones sin origin (mobile apps, Postman, Nginx proxy interno)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin no permitido: ${origin}`));
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Servir archivos estáticos (uploads) ──────────────────────────────────────
app.use('/uploads', express.static(uploadDir));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'Workforce Tracker API',
    version: '1.0.0',
    time:    new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`,      authRoutes);
app.use(`${API_PREFIX}/users`,     userRoutes);
app.use(`${API_PREFIX}/clients`,   clientRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/visits`,    visitRoutes);
app.use(`${API_PREFIX}/mobile`,    mobileRoutes);
app.use(`${API_PREFIX}/settings`,  settingRoutes);

// ── Not Found & Error Handlers ────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   Workforce Tracker API               ║
  ║   Servidor iniciado en ${HOST}:${PORT}  ║
  ║   Entorno: ${(process.env.NODE_ENV || 'development').padEnd(26)}║
  ╚════════════════════════════════════════╝
  `);
  
  // Iniciar tareas programadas de background
  const { startCronJobs } = require('./services/cron.service');
  startCronJobs();
});

module.exports = app;
