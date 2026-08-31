import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import adminAuthRoutes from './routes/adminAuth.routes';
import profileRoutes from './routes/profile.routes';
import businessRoutes from './routes/business.routes';
import uploadRoutes from './routes/upload.routes';
import regionalRoutes from './routes/regional.routes';
import apiRoutes from './routes/index';
import { setCsrfCookie } from './middlewares/csrf.middleware';
import { initFirebaseAdmin } from './config/firebase';
import { verifySmtpConfig } from './services/email.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const isProduction = process.env.NODE_ENV === 'production';

// ─── Security Middlewares ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://apis.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://flagcdn.com", "https://lh3.googleusercontent.com", "blob:"],
      connectSrc: ["'self'", process.env.CLIENT_URL || "http://localhost:5173", "https://machinichii.netlify.app"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  } : false,
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://machinichi.com',
  'https://www.machinichi.com',
  'https://machinichii.netlify.app',
  ...(!isProduction ? ['http://localhost:5173', 'http://localhost:5174'] : []),
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // In development, allow any local port origin (e.g., localhost:5174, 127.0.0.1:5173, etc.)
    const isLocalhost = !isProduction && origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (!origin || allowedOrigins.includes(origin) || isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-guest-id', 'Accept', 'Origin', 'X-Requested-With'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Custom NoSQL injection sanitization (Express 5 compatible)
app.use((req: Request, _res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = key.replace(/^\$/g, '').replace(/\./g, '');
      sanitized[cleanKey] = typeof value === 'object' && value !== null ? sanitize(value) : value;
    }
    return sanitized;
  };
  if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
  next();
});

// ─── Third-Party Init ────────────────────────────────────────────────────────
initFirebaseAdmin();

// ─── CSRF (non-GET non-auth routes) ──────────────────────────────────────────
app.use('/api', setCsrfCookie);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/admin/businesses', businessRoutes);

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── API Routes (cart, products, orders, etc.) ───────────────────────────────
app.use('/api', apiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/regional', regionalRoutes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[GLOBAL ERROR]', err?.message || err);
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(err.errors) });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate entry' });
  }
  const statusCode = err?.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err?.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err?.stack }),
  });
});

// ─── Database & Server Start ─────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('FATAL: MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function connectWithRetry(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGO_URI as string, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      } as any);
      console.log('Connected to MongoDB Atlas');
      app.listen(PORT, async () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`[SMTP STARTUP] Verifying SMTP configuration...`);
        const smtpReady = await verifySmtpConfig();
        if (!smtpReady) {
          console.warn(`[SMTP STARTUP] WARNING: SMTP is NOT configured correctly. Welcome emails will fail.`);
          console.warn(`[SMTP STARTUP] Please check SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, and EMAIL_FROM in .env`);
        }
      });
      return;
    } catch (err: any) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${retries}):`, err.message);
      if (attempt === retries) {
        console.error('All MongoDB retries exhausted. Check:');
        console.error('  1. Internet/VPN — Atlas requires outbound 27017');
        console.error('  2. Atlas Network Access → IP Whitelist (add 0.0.0.0/0 for dev or your current IP)');
        console.error('  3. MONGODB_URI credentials/cluster still valid');
        console.error('  4. Try SRV form: mongodb+srv://mdpitme_db_user:<pwd>@ac-uc7bea3.t2qzlhy.mongodb.net/machinichi?retryWrites=true&w=majority');
        process.exit(1);
      }
      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
connectWithRetry();
